import { on, once } from 'node:events'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'

import CONFIG, { nodemailerTransportOptions } from './config'
import { getContext } from './context'
import logger from './logger'
import createServer from './server'

import type { AddressInfo } from 'node:net'

// This file drives createServer over a REAL listening socket. test/helpers.ts reaches the schema
// through `server.executeOperation`, which enters Apollo BELOW the transport — so everything
// createServer actually adds on top of the schema (the Express chain, the request-context wiring
// and the WebSocket upgrade routing) is invisible to every other spec in the suite. The
// interesting behaviour here is exactly that transport layer, and it can only be observed by
// speaking HTTP and WebSocket to it.

// `embedProviders` is `allow` in the shield rules and resolves from a static list — a request
// that reaches the schema succeeds without a user and without touching the database, so a failure
// here is always a transport failure and never a fixture one.
const PUBLIC_QUERY = '{ embedProviders { name url } }'

interface Started {
  httpUrl: string
  wsUrl: string
  stop: () => Promise<void>
}

const start = async (options?: Parameters<typeof createServer>[0]): Promise<Started> => {
  const { server, httpServer } = await createServer({ skipLiveKitBoot: true, ...options })
  httpServer.listen(0, '127.0.0.1')
  await once(httpServer, 'listening')
  const { port } = httpServer.address() as AddressInfo
  return {
    httpUrl: `http://127.0.0.1:${String(port)}/`,
    wsUrl: `ws://127.0.0.1:${String(port)}/`,
    // `server.stop()` alone: ApolloServerPluginDrainHttpServer closes the http server as part of
    // draining, and the createServer-local plugin disposes both WebSocket servers in the same
    // pass. Calling httpServer.close() afterwards would only report ERR_SERVER_NOT_RUNNING.
    stop: async () => server.stop(),
  }
}

const open = async (url: string, protocol?: string) => {
  const socket = protocol ? new WebSocket(url, protocol) : new WebSocket(url)
  await once(socket, 'open')
  return socket
}

// Buffered from the moment the socket opens, which `once('message')` per read would not be: the
// server answers connection_init and the first operation back to back, and a listener attached
// after the fact would miss whichever arrived first.
const reader = (socket: WebSocket) => {
  const stream = on(socket, 'message')
  return {
    next: async () => {
      // `on()` only completes when the emitter errors or the iterator is returned, so a value is
      // always present here — the test times out rather than reading `done` if the server stays
      // silent, which is the more useful failure of the two.
      const [data] = (await stream.next()).value as [unknown]
      return JSON.parse(String(data)) as Record<string, unknown>
    },
    close: async () => {
      await stream.return?.()
    },
  }
}

describe(createServer, () => {
  describe('HTTP transport', () => {
    let running: Started

    beforeAll(async () => {
      running = await start()
    })

    afterAll(async () => {
      await running.stop()
    })

    // The default branch of the context option: production passes no `context`, so every request
    // has to build one from `getContext()`. Every other spec injects its own context function and
    // therefore never walks this line.
    it('serves a public query through the default request context', async () => {
      const response = await fetch(running.httpUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: PUBLIC_QUERY }),
      })

      expect(response.status).toBe(200)

      const body = (await response.json()) as {
        data?: { embedProviders?: { name: string; url: string }[] }
        errors?: unknown
      }

      expect(body.errors).toBeUndefined()
      expect(body.data?.embedProviders?.length).toBeGreaterThan(0)
    })

    // A GET carries no body at all, and body-parser 2 leaves `req.body` UNDEFINED in that case
    // (v1 used to assign `{}`). Apollo's express middleware reads `req.body` unconditionally and
    // answers 500 "body is missing" without the fallback middleware, so this asserts the reason
    // that middleware exists rather than just its presence.
    it('answers a GET query, whose request carries no parsed body', async () => {
      // No content-type header on purpose — that is what stops body-parser from assigning one.
      const response = await fetch(`${running.httpUrl}?query=${encodeURIComponent(PUBLIC_QUERY)}`)

      expect(response.status).toBe(200)

      const body = (await response.json()) as {
        data?: { embedProviders?: { name: string }[] }
        errors?: unknown
      }

      expect(body.errors).toBeUndefined()
      expect(body.data?.embedProviders?.length).toBeGreaterThan(0)
    })
  })

  // The injected-context branch, which is the one test/helpers.ts uses throughout the suite.
  // Asserted on the ARGUMENT, not just on the call: the request object handed over is what
  // getContext reads the Authorization header from, and a middleware inserted above it that
  // replaced the object would silently unauthenticate every request.
  it('prefers an injected context function and hands it the request', async () => {
    const context = vi.fn(async (req: { headers: { authorization?: string } }) =>
      getContext({ authenticatedUser: null, config: CONFIG })(req),
    )
    const running = await start({ context })
    try {
      const response = await fetch(running.httpUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer test-token' },
        body: JSON.stringify({ query: PUBLIC_QUERY }),
      })

      expect(response.status).toBe(200)
      expect(context).toHaveBeenCalledTimes(1)
      expect(context.mock.calls[0][0].headers.authorization).toBe('Bearer test-token')
    } finally {
      await running.stop()
    }
  })

  // Two WebSocket servers share one port and are told apart ONLY by the subprotocol on the
  // upgrade request. Getting that routing wrong does not fail loudly — it hands the client to a
  // server that speaks a different protocol, and the connection just never acknowledges. Each
  // case below therefore drives the handshake far enough to prove WHICH server answered.
  describe('WebSocket transport', () => {
    let running: Started

    beforeAll(async () => {
      running = await start()
    })

    afterAll(async () => {
      await running.stop()
    })

    // graphql-transport-ws is the modern subprotocol and must land on the graphql-ws server.
    // Carried through to a real operation because `useServer`'s context callback — the one that
    // turns connectionParams into a request context — only runs once an operation is subscribed.
    it('routes the graphql-transport-ws subprotocol to the modern server', async () => {
      const socket = await open(running.wsUrl, 'graphql-transport-ws')
      const read = reader(socket)
      try {
        socket.send(
          JSON.stringify({ type: 'connection_init', payload: { headers: { authorization: '' } } }),
        )

        expect(await read.next()).toMatchObject({ type: 'connection_ack' })

        socket.send(
          JSON.stringify({ id: '1', type: 'subscribe', payload: { query: PUBLIC_QUERY } }),
        )
        const next = (await read.next()) as unknown as {
          type: string
          payload: { data?: { embedProviders?: unknown[] }; errors?: unknown }
        }

        expect(next.type).toBe('next')
        expect(next.payload.errors).toBeUndefined()
        expect(next.payload.data?.embedProviders?.length).toBeGreaterThan(0)
      } finally {
        await read.close()
        socket.close()
        await once(socket, 'close')
      }
    })

    // Anonymous clients send no connectionParams at all. Without the `?? {}` normalisation the
    // context builder would read `.authorization` off undefined and the connection would die with
    // an internal error instead of resolving to an anonymous viewer.
    it('accepts a modern connection that sends no connectionParams', async () => {
      const socket = await open(running.wsUrl, 'graphql-transport-ws')
      const read = reader(socket)
      try {
        socket.send(JSON.stringify({ type: 'connection_init' }))

        expect(await read.next()).toMatchObject({ type: 'connection_ack' })

        socket.send(
          JSON.stringify({ id: '1', type: 'subscribe', payload: { query: PUBLIC_QUERY } }),
        )
        const next = (await read.next()) as unknown as {
          type: string
          payload: { errors?: unknown }
        }

        expect(next.type).toBe('next')
        expect(next.payload.errors).toBeUndefined()
      } finally {
        await read.close()
        socket.close()
        await once(socket, 'close')
      }
    })

    // `graphql-ws` is the subprotocol name of the LEGACY library (subscriptions-transport-ws) —
    // the collision with the modern library's package name is exactly why this routing is easy to
    // invert. The legacy server is what the deployed Nuxt 2 webapp still connects with.
    it('routes the legacy graphql-ws subprotocol to the legacy server', async () => {
      const socket = await open(running.wsUrl, 'graphql-ws')
      const read = reader(socket)
      try {
        socket.send(
          JSON.stringify({ type: 'connection_init', payload: { headers: { authorization: '' } } }),
        )

        expect(await read.next()).toMatchObject({ type: 'connection_ack' })
      } finally {
        await read.close()
        socket.close()
        await once(socket, 'close')
      }
    })

    // A request with NO subprotocol is routed to the legacy server too. It does not get a usable
    // connection out of it — subscriptions-transport-ws rejects any socket whose subprotocol is
    // neither graphql-ws nor graphql-subscriptions — but WHICH server rejects it is observable
    // from the close code, and that is the routing decision under test: 1002 (protocol error) is
    // the legacy library's, while graphql-ws closes an unacceptable subprotocol with 4406. So
    // this pins down both that the `!protocol` operand routes to the legacy side, and that a bare
    // `new WebSocket(url)` is not a supported client.
    it('routes a connection without any subprotocol to the legacy server, which rejects it', async () => {
      const socket = await open(running.wsUrl)

      const [code] = (await once(socket, 'close')) as [number]

      expect(code).toBe(1002)
    })

    // Both servers log their own disconnect line. Kept apart because the two callbacks are
    // registered on different servers: a routing regression that sent every client to one of them
    // would still produce a disconnect log, just always the same one.
    it.each([
      ['graphql-transport-ws', 'WebSocket client disconnected'],
      ['graphql-ws', 'Legacy WebSocket client disconnected'],
    ])('logs the disconnect of a %s client', async (protocol, expected) => {
      const debug = vi.spyOn(logger, 'debug').mockImplementation(() => undefined)
      try {
        const socket = await open(running.wsUrl, protocol)
        const read = reader(socket)
        socket.send(JSON.stringify({ type: 'connection_init', payload: {} }))
        await read.next()
        await read.close()
        socket.close()
        await once(socket, 'close')

        await vi.waitFor(() => {
          expect(debug).toHaveBeenCalledWith(expected)
        })
      } finally {
        debug.mockRestore()
      }
    })
  })

  // Boot-time wiring that a single shared server instance cannot express, because it is decided
  // before the first request. Each case re-imports the module graph with its own mocks.
  describe('boot options', () => {
    afterEach(() => {
      vi.doUnmock('./config')
      vi.doUnmock('./livekit/poller')
      vi.doUnmock('./livekit/webhook')
      vi.resetModules()
    })

    // CONFIG.DEBUG is read at boot and decides whether helmet's CSP is installed — the playground
    // loads external resources and cannot run under it. Both sides are mocked rather than read
    // from the ambient environment on purpose: `.env` ships DEBUG=neo4j-graphql-js (truthy) while
    // the CI compose stack sets DEBUG= (falsy), so an unmocked assertion would pass in one place
    // and fail in the other.
    it.each([
      [true, false],
      [false, true],
    ])(
      'with DEBUG=%s sends a Content-Security-Policy: %s',
      async (DEBUG, expectHeader) => {
        vi.resetModules()
        // `nodemailerTransportOptions` is re-exported so the mock stays a drop-in for the whole
        // module: the mock replaces src/config for EVERY importer in the reset graph, not just
        // for server.ts.
        vi.doMock('./config', () => ({
          default: { ...CONFIG, DEBUG },
          nodemailerTransportOptions,
        }))

        const build = (await import('./server')).default
        const { server, httpServer } = await build({ skipLiveKitBoot: true })
        httpServer.listen(0, '127.0.0.1')
        await once(httpServer, 'listening')
        const { port } = httpServer.address() as AddressInfo
        try {
          const response = await fetch(`http://127.0.0.1:${String(port)}/`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ query: PUBLIC_QUERY }),
          })

          expect(response.headers.has('content-security-policy')).toBe(expectHeader)
        } finally {
          await server.stop()
        }
      },
      30000,
    )

    // The production boot path. Both are skipped by the test helpers (they would leave polling
    // timers running across the suite), which is why nothing else reaches this branch — and the
    // ORDER is load-bearing: the webhook route has to be registered before the JSON body parser
    // below it, or the raw payload its HMAC signature is computed over is already consumed.
    it('registers the LiveKit webhook and starts the poller unless asked not to', async () => {
      vi.resetModules()
      const startLiveKitPoller = vi.fn()
      const registerLiveKitWebhook = vi.fn()
      vi.doMock('./livekit/poller', () => ({ startLiveKitPoller }))
      vi.doMock('./livekit/webhook', () => ({ registerLiveKitWebhook }))

      const build = (await import('./server')).default
      const { server } = await build()
      try {
        expect(registerLiveKitWebhook).toHaveBeenCalledTimes(1)
        expect(startLiveKitPoller).toHaveBeenCalledTimes(1)
      } finally {
        await server.stop()
      }
    }, 30000)
  })
})

/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import-x/no-named-as-default-member */
/* eslint-disable import-x/no-deprecated */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import http from 'node:http'

import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { searchPath } from '@ocelot-social/branding/dist/discover.js'
import bodyParser from 'body-parser'
import express from 'express'
import { execute, subscribe } from 'graphql'
import { graphqlUploadExpress } from 'graphql-upload'
import { useServer } from 'graphql-ws/lib/use/ws'
import helmet from 'helmet'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { WebSocketServer } from 'ws'

import { brandingRouter } from './branding/routes'
import CONFIG from './config'
import { getContext } from './context'
import schema from './graphql/schema'
import { startLiveKitPoller } from './livekit/poller'
import { registerLiveKitWebhook } from './livekit/webhook'
import logger from './logger'
import middleware from './middleware'

import type { ApolloServerPlugin } from '@apollo/server'

interface CreateServerOptions {
  context?: (req: { headers: { authorization?: string } }) => Promise<any>
  plugins?: ApolloServerPlugin[]
  // Test helpers spin up many ApolloServer instances per run; skipping the
  // webhook + poller boot avoids both their startup logs (which clutter
  // logger spec assertions) and the in-flight timers that would otherwise
  // log "Cannot log after tests are done" warnings on teardown.
  skipLiveKitBoot?: boolean
}

const createServer = async (options?: CreateServerOptions) => {
  const app = express()
  const httpServer = http.createServer(app)
  const appliedSchema = middleware(schema)

  // Two WebSocket servers for dual protocol support (noServer mode)
  const wsServer = new WebSocketServer({ noServer: true })
  const legacyWsServer = new WebSocketServer({ noServer: true })

  // Extract { headers: { authorization } } shape from arbitrary connectionParams.
  // Authenticated clients send { headers: { authorization: 'Bearer ...' } };
  // anonymous clients may send undefined / {} — both must yield a context with
  // user = null instead of crashing inside getContext on req.headers undefined.
  const normaliseWsHeaders = (
    connectionParams: Record<string, unknown> | null | undefined,
  ): { headers: { authorization?: string } } => {
    const headers = (connectionParams as { headers?: { authorization?: string } } | undefined)
      ?.headers
    return { headers: headers ?? {} }
  }

  // New protocol: graphql-ws (subprotocol: graphql-transport-ws)
  const serverCleanup = useServer(
    {
      schema: appliedSchema,
      context: async (ctx) =>
        getContext()(normaliseWsHeaders(ctx.connectionParams as Record<string, unknown>)),
      onDisconnect: () => {
        logger.debug('WebSocket client disconnected')
      },
    },
    // `@types/ws` is a CommonJS types package, so under NodeNext TypeScript instantiates it once
    // per resolution mode: this file is ESM and gets the `import` flavour, graphql-ws' own `.d.ts`
    // is CJS and gets the `require` one. Same class at runtime, two incompatible types at compile
    // time (`options.WebSocket` is the synthetic default on one side, the module namespace on the
    // other). The cast states that they are the same object; it goes away with graphql-ws 6,
    // which ships ESM types.
    wsServer as Parameters<typeof useServer>[1],
  )

  // Legacy protocol: subscriptions-transport-ws (subprotocol: graphql-ws)
  const legacyServerCleanup = SubscriptionServer.create(
    {
      schema: appliedSchema,
      execute,
      subscribe,
      onConnect: async (connectionParams: Record<string, unknown>) => {
        return getContext()(normaliseWsHeaders(connectionParams))
      },
      onDisconnect: () => {
        logger.debug('Legacy WebSocket client disconnected')
      },
    },
    legacyWsServer,
  )

  // Route WebSocket upgrade requests based on subprotocol
  httpServer.on('upgrade', (req, socket, head) => {
    const protocol = req.headers['sec-websocket-protocol']
    const isLegacy = protocol === 'graphql-ws' || !protocol
    const targetServer = isLegacy ? legacyWsServer : wsServer
    targetServer.handleUpgrade(req, socket, head, (ws) => {
      targetServer.emit('connection', ws, req)
    })
  })

  const server = new ApolloServer({
    schema: appliedSchema,
    // TODO: Re-enable CSRF prevention once the webapp sends the 'apollo-require-preflight' header.
    // Currently disabled because the Nuxt 2 webapp uses apollo-upload-client for multipart/form-data
    // file uploads, which Apollo Server 4 blocks by default as a CSRF vector. The webapp relies on
    // JWT/cookie authentication and CORS configuration for request validation instead.
    csrfPrevention: false,
    // No `formatError`: the one it used to carry unwrapped neode's Joi validation errors, whose
    // `originalError.details` it flattened into the 'ERROR_VALIDATION' placeholder message. neode
    // is gone (see src/db/schema), nothing throws that message any more and nothing attaches
    // `.details` to an error, so the hook had become an identity function on every code path.
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        // eslint-disable-next-line @typescript-eslint/require-await
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose()
              legacyServerCleanup.close()
            },
          }
        },
      },
      ...(options?.plugins ?? []),
    ],
  })

  await server.start()

  // TODO: this exception is required for the graphql playground, since the playground loads external resources
  // See: https://github.com/graphql/graphql-playground/issues/1283
  app.use(
    helmet(
      (CONFIG.DEBUG && { contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }) || {},
    ) as any,
  )
  // No static file mount: the backend serves GraphQL and the brand archives below, nothing else.
  // Badge icons live in the webapp's static/ (same /img/badges/… URLs), brand assets are read from the
  // archive by the webapp, and providers.json became the `embedProviders` query.
  //
  // Brand archives this backend has on disk, served read-only so the webapp can acquire them instead
  // of shipping its own copy. Mounted before the body parsers — these are plain GETs with no body.
  // The search path is resolved HERE (env, else the conventional locations) and handed over, so the
  // router itself stays free of ambient configuration.
  // eslint-disable-next-line n/no-process-env -- the deployment's assets dir, read once and passed in
  app.use('/branding', brandingRouter(searchPath(process.env.OCELOT_BRANDING_ASSETS_DIR)))
  if (!options?.skipLiveKitBoot) {
    // LiveKit webhook must be registered before the global JSON body parser so
    // the raw payload is preserved for HMAC signature verification.
    registerLiveKitWebhook(app)
    // Polling fallback for environments without (or with broken) webhooks —
    // publishes participant-count updates through the same pubsub channel.
    startLiveKitPoller()
  }
  app.use(bodyParser.json({ limit: '10mb' }) as any)
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }) as any)
  app.use(graphqlUploadExpress())
  app.use((req, _res, next) => {
    if (!req.body) {
      req.body = {}
    }
    next()
  })
  app.use(
    '/',
    expressMiddleware(server, {
      context: async ({ req }) => {
        if (options?.context) {
          return options.context(req)
        }
        return getContext()(req)
      },
    }),
  )

  return { server, httpServer, app }
}

export default createServer

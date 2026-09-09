import { ApolloLink } from 'apollo-link'
import gql from 'graphql-tag'
import { SubscriptionClient } from 'subscriptions-transport-ws'
import { createApolloClient } from 'vue-cli-plugin-apollo/graphql-client'

import apolloConfig from './apollo-config.js'

// The websocket is the one part of the composition that cannot be exercised for real: both stand-ins
// are constructed unconditionally by createApolloClient as soon as a `wsEndpoint` is configured, and
// the real ones would open a socket to wss://ocelot.test. The mocks keep the LINK GRAPH intact —
// `split()` still gets a genuine ApolloLink — so what the tests below assert about routing is the
// production wiring, not the mock's.
jest.mock('subscriptions-transport-ws', () => ({
  SubscriptionClient: jest.fn().mockImplementation((endpoint, options) => ({ endpoint, options })),
}))

jest.mock('apollo-link-ws', () => {
  const { ApolloLink: Link, Observable } = require('apollo-link')
  return {
    // Emits a payload shaped like the SUBSCRIPTION document below — the cache writes every
    // subscription result, and a shape that does not match the selection set only produces warnings.
    WebSocketLink: jest.fn().mockImplementation(
      () =>
        new Link(
          () =>
            new Observable((observer) => {
              observer.next({
                data: { chatMessageAdded: { __typename: 'Message', id: 'served-by-websocket' } },
              })
              observer.complete()
            }),
        ),
    ),
  }
})

const context = ({ cookies = {}, $config = {}, env = {} } = {}) => ({
  req: {
    env: {
      GRAPHQL_URI: 'http://backend:4000',
      // Shaped like the real deployment: the helm chart sets wss://<domain>/api/graphql — the
      // ingress, not the backend host (templates/webapp/deployment.yaml).
      WEBSOCKETS_URI: 'wss://ocelot.test/api/graphql',
      ...env,
    },
  },
  app: {
    $config,
    $cookies: { get: (name) => cookies[name], set: jest.fn(), remove: jest.fn() },
  },
})

describe('apollo client config', () => {
  it('authenticates with the cookie the DEPLOYMENT configured, not a build-baked name', () => {
    // The whole point of overriding getAuth: @nuxtjs/apollo's own read is bound to a literal frozen
    // into the bundle at build time, which a per-deployment COOKIE_NAME can never change.
    const { getAuth } = apolloConfig(
      context({
        cookies: { 'yunite-me-token': 'jwt' },
        $config: { cookieName: 'yunite-me-token' },
      }),
    )
    expect(getAuth()).toBe('Bearer jwt')
  })

  it('accepts a session still stored under a legacy cookie name', () => {
    const { getAuth } = apolloConfig(
      context({
        cookies: { 'ocelot-social-token': 'old-jwt' },
        $config: { cookieName: 'yunite-me-token' },
      }),
    )
    expect(getAuth()).toBe('Bearer old-jwt')
  })

  it('sends no authorization header when there is no cookie', () => {
    expect(apolloConfig(context()).getAuth()).toBe('')
  })

  it('reads the cookie per call, so a token written after setup is picked up', () => {
    const cookies = {}
    const config = apolloConfig(context({ cookies, $config: { cookieName: 'a-token' } }))
    expect(config.getAuth()).toBe('')
    cookies['a-token'] = 'later-jwt'
    expect(config.getAuth()).toBe('Bearer later-jwt')
  })

  it('installs the GraphQL-response link WITHOUT replacing the http link', () => {
    // `defaultHttpLink` is deliberately left at its default: vue-cli-plugin-apollo then combines the
    // two as `from([link, httpLink])`, which is what makes ours a wrapper rather than the transport.
    // Turning it off here would leave the client with no terminating link at all.
    const config = apolloConfig(context())
    expect(config.link).toBeInstanceOf(ApolloLink)
    expect(config.defaultHttpLink).toBeUndefined()
  })

  it('routes browser HTTP through the /api proxy and subscriptions to the configured WEBSOCKETS_URI', () => {
    // process.server is falsy under jest, so this is the browser branch. Two DIFFERENT contracts:
    // httpEndpoint is rewritten to the nuxt proxy (same-origin, backend host out of the bundle),
    // while wsEndpoint is passed through verbatim — ops decide where the socket goes.
    const config = apolloConfig(context())
    expect(config.httpEndpoint).toBe('/api')
    expect(config.wsEndpoint).toBe('wss://ocelot.test/api/graphql')
  })

  describe('during SSR', () => {
    // The server branch has to be entered deliberately — without this, `httpEndpoint` is '/api' no
    // matter what the environment says, and any assertion about the backend URL passes vacuously.
    let previousServer
    beforeEach(() => {
      previousServer = process.server
      process.server = true
    })
    afterEach(() => {
      process.server = previousServer
    })

    it('talks to the backend directly — there is no proxy in front of the nuxt server', () => {
      expect(apolloConfig(context()).httpEndpoint).toBe('http://backend:4000')
    })

    it('falls back to localhost when no backend URI is configured', () => {
      const ctx = context()
      delete ctx.req.env.GRAPHQL_URI
      expect(apolloConfig(ctx).httpEndpoint).toBe('http://localhost:4000')
    })
  })

  describe('composed into the client vue-cli-plugin-apollo actually builds', () => {
    // The assertions above only describe the config OBJECT. Everything that makes it work is
    // decided afterwards, inside createApolloClient: `from([link, httpLink])`, the `setContext` auth
    // link wrapped around both, and `split(isSubscription, wsLink, link)`. Get one of those wrong —
    // by turning off `defaultHttpLink`, or by making our link terminating — and every assertion up
    // there still passes while the app talks to nothing. So build the real client here.
    const QUERY = gql`
      query Posts {
        Post {
          id
        }
      }
    `
    const SUBSCRIPTION = gql`
      subscription ChatMessage {
        chatMessageAdded {
          id
        }
      }
    `

    // Mirrors @nuxtjs/apollo's generated plugin (lib/templates/plugin.js): it spreads the client
    // config and then sets `ssr` and `tokenName` itself.
    const buildClient = (
      ctx = context({ cookies: { 'a-token': 'jwt' }, $config: { cookieName: 'a-token' } }),
    ) =>
      createApolloClient({
        ...apolloConfig(ctx),
        ssr: !!process.server,
        tokenName: 'apollo-token',
      })

    const respondWith = (status, body) =>
      global.fetch.mockResolvedValue({
        status,
        // apollo-link-http-common reads the body as TEXT and parses it itself.
        text: () => Promise.resolve(JSON.stringify(body)),
      })

    beforeEach(() => {
      // apollo-upload-client's `checkFetcher` runs while the link is BUILT, not when it is used, so
      // a global fetch has to exist even for the tests that never send a request.
      global.fetch = jest.fn()
    })

    afterEach(() => {
      delete global.fetch
      jest.clearAllMocks()
    })

    it('surfaces a 4xx GraphQL response as graphQLErrors instead of a network outage', async () => {
      // The regression the response link exists for, proven END TO END: Apollo Server 5 answers a
      // variable-coercion failure with 400 + a well-formed body, apollo-upload-client rejects it as
      // a ServerError, and only the composition `from([ours, httpLink])` turns it back into what the
      // component layer can render. A terminating or mis-ordered link breaks exactly this.
      respondWith(400, {
        errors: [
          {
            message: 'Variable "$orderBy" got invalid value "nonsense"',
            extensions: { code: 'BAD_USER_INPUT' },
          },
        ],
      })

      const error = await buildClient()
        .apolloClient.query({ query: QUERY })
        .catch((caught) => caught)

      expect(error.networkError).toBeNull()
      expect(error.graphQLErrors).toEqual([
        expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } }),
      ])
    })

    it('still fails loudly when the transport itself breaks', async () => {
      // The other half of the contract: a 5xx carrying an errors array must NOT be laundered into a
      // field error, or every backend crash hides behind a message about the user's input.
      respondWith(500, { errors: [{ message: 'Internal server error' }] })

      const error = await buildClient()
        .apolloClient.query({ query: QUERY })
        .catch((caught) => caught)

      expect(error.networkError).toMatchObject({ statusCode: 500 })
    })

    it('sends queries to the http endpoint with the cookie session attached', async () => {
      // Proves the auth link is composed AROUND ours rather than shadowed by it: getAuth feeds the
      // header of the request that actually goes over the wire.
      const fetchMock = respondWith(200, { data: { Post: [] } })

      await buildClient().apolloClient.query({ query: QUERY })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [uri, options] = fetchMock.mock.calls[0]
      expect(uri).toBe('/api')
      expect(options.headers).toMatchObject({ authorization: 'Bearer jwt' })
    })

    it('routes subscriptions over the websocket, never through the http chain', async () => {
      // `split()` is the only thing keeping subscriptions off the HTTP link — and off our response
      // link with it, which is why that link may assume it never sees a long-lived operation.
      const fetchMock = respondWith(200, { data: {} })
      const { apolloClient } = buildClient()

      const result = await new Promise((resolve, reject) => {
        apolloClient.subscribe({ query: SUBSCRIPTION }).subscribe({ next: resolve, error: reject })
      })

      // Only the websocket link can produce this id — the http transport was never asked.
      expect(result.data.chatMessageAdded).toMatchObject({ id: 'served-by-websocket' })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('points the websocket at the configured WEBSOCKETS_URI and authenticates it with the cookie', () => {
      // wsEndpoint is passed through verbatim (ops own it) and the socket authenticates through the
      // SAME getAuth as HTTP — connectionParams is a function, so a token written later still counts.
      buildClient()

      expect(SubscriptionClient).toHaveBeenCalledTimes(1)
      const [endpoint, options] = SubscriptionClient.mock.calls[0]
      expect(endpoint).toBe('wss://ocelot.test/api/graphql')
      expect(options.connectionParams()).toEqual({
        authorization: 'Bearer jwt',
        headers: { authorization: 'Bearer jwt' },
      })
    })
  })
})

import apolloConfig from './apollo-config.js'

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
})

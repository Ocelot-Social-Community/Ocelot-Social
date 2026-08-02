import apolloConfig from './apollo-config.js'

const context = ({ cookies = {}, $config = {}, env = {} } = {}) => ({
  req: {
    env: { GRAPHQL_URI: 'http://backend:4000', WEBSOCKETS_URI: 'ws://backend/graphql', ...env },
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

  it('points the browser at the proxy and the server at the backend', () => {
    const config = apolloConfig(context())
    expect(config.wsEndpoint).toBe('ws://backend/graphql')
    // process.server is falsy under jest → the browser branch
    expect(config.httpEndpoint).toBe('/api')
  })

  it('falls back to localhost when no backend URI is configured', () => {
    const ctx = context()
    delete ctx.req.env.GRAPHQL_URI
    expect(apolloConfig(ctx).httpEndpoint).toBe('/api')
  })
})

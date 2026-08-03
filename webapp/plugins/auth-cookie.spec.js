import authCookiePlugin from './auth-cookie.js'

describe('auth-cookie plugin', () => {
  it('injects an accessor bound to the deployment-configured cookie name', () => {
    const $cookies = { get: jest.fn(() => 'jwt'), set: jest.fn(), remove: jest.fn() }
    const inject = jest.fn()

    authCookiePlugin({ app: { $cookies, $config: { cookieName: 'yunite-me-token' } } }, inject)

    const [key, authCookie] = inject.mock.calls[0]
    expect(key).toBe('authCookie')
    expect(authCookie.name).toBe('yunite-me-token')
    expect(authCookie.get()).toBe('jwt')
    expect($cookies.get).toHaveBeenCalledWith('yunite-me-token')
  })

  it('lets a missing $cookies fail the boot instead of injecting a half-working accessor', () => {
    // Not a duplicate of the createAuthCookie unit test: what is pinned HERE is the absence of a
    // try/catch around it. Swallowing that error — a plausible "make the plugin defensive" change —
    // would boot an app whose every request goes out anonymous, with nothing in the log to say why.
    const inject = jest.fn()
    expect(() => authCookiePlugin({ app: {} }, inject)).toThrow(/cookie-universal-nuxt/)
    expect(inject).not.toHaveBeenCalled()
  })
})

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
})

import {
  DEFAULT_COOKIE_NAME,
  DEFAULT_EXPIRE_DAYS,
  createAuthCookie,
  resolveCookieAttributes,
  resolveCookieName,
  resolveLegacyCookieNames,
} from './authCookie.js'

// A stand-in for cookie-universal-nuxt's $cookies over a plain name → value map.
const cookieJar = (initial = {}) => {
  const jar = { ...initial }
  return {
    jar,
    $cookies: {
      get: jest.fn((name) => jar[name]),
      set: jest.fn((name, value, options) => {
        jar[name] = value
        jar[`${name}:options`] = options
      }),
      remove: jest.fn((name) => {
        delete jar[name]
      }),
    },
  }
}

const contextWith = ($cookies, $config) => ({ app: { $cookies, $config } })

describe('resolveCookieName', () => {
  it('is the configured name, or the framework default when unset', () => {
    expect(resolveCookieName({ cookieName: 'yunite-me-token' })).toBe('yunite-me-token')
    expect(resolveCookieName({})).toBe(DEFAULT_COOKIE_NAME)
    expect(resolveCookieName(undefined)).toBe(DEFAULT_COOKIE_NAME)
  })
})

describe('resolveLegacyCookieNames', () => {
  it('defaults to the framework name, so a rename adopts the sessions it renamed away from', () => {
    expect(resolveLegacyCookieNames({ cookieName: 'yunite-me-token' })).toEqual([
      DEFAULT_COOKIE_NAME,
    ])
  })

  it('splits and trims a configured list', () => {
    expect(
      resolveLegacyCookieNames({ cookieName: 'new-token', cookieLegacyNames: 'a-token, b-token' }),
    ).toEqual(['a-token', 'b-token'])
  })

  it('never lists the name in use (it would just be read twice)', () => {
    expect(resolveLegacyCookieNames({})).toEqual([])
    expect(
      resolveLegacyCookieNames({ cookieName: 'a-token', cookieLegacyNames: 'a-token,b-token' }),
    ).toEqual(['b-token'])
  })

  it('switches the adoption off for an explicitly empty setting', () => {
    expect(resolveLegacyCookieNames({ cookieName: 'new-token', cookieLegacyNames: '' })).toEqual([])
  })
})

describe('resolveCookieAttributes', () => {
  it('turns the configured lifetime into an absolute expiry', () => {
    const { expires } = resolveCookieAttributes({ cookieExpireDays: 30 })
    const days = (expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    expect(days).toBeCloseTo(30, 1)
  })

  it('falls back to the default lifetime for a missing or unusable value', () => {
    const inDays = (config) =>
      (resolveCookieAttributes(config).expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    // 'thirty' → NaN and 0/-1 would expire the cookie immediately: a mistyped value must not log
    // everyone out, it must fall back.
    expect(inDays({ cookieExpireDays: 'thirty' })).toBeCloseTo(DEFAULT_EXPIRE_DAYS, 1)
    expect(inDays({ cookieExpireDays: 0 })).toBeCloseTo(DEFAULT_EXPIRE_DAYS, 1)
    expect(inDays({})).toBeCloseTo(DEFAULT_EXPIRE_DAYS, 1)
    expect(inDays(undefined)).toBeCloseTo(DEFAULT_EXPIRE_DAYS, 1)
  })

  it('keeps path and sameSite fixed and takes Secure from the deployment', () => {
    expect(resolveCookieAttributes({ cookieHttpsOnly: true })).toMatchObject({
      path: '/',
      sameSite: 'lax',
      secure: true,
    })
    expect(resolveCookieAttributes({ cookieHttpsOnly: false }).secure).toBe(false)
  })
})

describe('createAuthCookie', () => {
  it('throws a pointed error when $cookies is not injected yet', () => {
    // The plugin-order trap: apollo's client config is built before cookie-universal-nuxt's plugin
    // unless the module is registered after it. Failing loudly beats every request going out
    // unauthenticated.
    expect(() => createAuthCookie({ app: {} })).toThrow(/cookie-universal-nuxt/)
    expect(() => createAuthCookie(undefined)).toThrow(/cookie-universal-nuxt/)
  })

  it('accepts $cookies/$config injected on the context itself', () => {
    const { $cookies } = cookieJar({ 'yunite-me-token': 'jwt' })
    const authCookie = createAuthCookie({ $cookies, $config: { cookieName: 'yunite-me-token' } })
    expect(authCookie.get()).toBe('jwt')
  })

  it('reads the configured cookie', () => {
    const { $cookies } = cookieJar({ 'yunite-me-token': 'jwt', [DEFAULT_COOKIE_NAME]: 'stale' })
    const authCookie = createAuthCookie(contextWith($cookies, { cookieName: 'yunite-me-token' }))
    expect(authCookie.name).toBe('yunite-me-token')
    expect(authCookie.get()).toBe('jwt')
  })

  it('adopts a session still living under a legacy name (nobody is logged out by a rename)', () => {
    const { $cookies } = cookieJar({ [DEFAULT_COOKIE_NAME]: 'old-jwt' })
    const authCookie = createAuthCookie(contextWith($cookies, { cookieName: 'yunite-me-token' }))
    expect(authCookie.get()).toBe('old-jwt')
  })

  it('returns undefined when neither the configured nor a legacy cookie is set', () => {
    const { $cookies } = cookieJar()
    expect(createAuthCookie(contextWith($cookies, {})).get()).toBeUndefined()
  })

  it('writes under the configured name with the resolved attributes', () => {
    const { jar, $cookies } = cookieJar()
    const authCookie = createAuthCookie(
      contextWith($cookies, {
        cookieName: 'yunite-me-token',
        cookieExpireDays: 30,
        cookieHttpsOnly: true,
      }),
    )
    authCookie.set('fresh-jwt')
    expect(jar['yunite-me-token']).toBe('fresh-jwt')
    expect(jar['yunite-me-token:options']).toMatchObject({ path: '/', secure: true })
  })

  it('clears the legacy cookie along with the current one on logout', () => {
    // Otherwise the read fallback would adopt the just-logged-out session on the next visit.
    const { jar, $cookies } = cookieJar({
      'yunite-me-token': 'jwt',
      [DEFAULT_COOKIE_NAME]: 'old-jwt',
    })
    createAuthCookie(contextWith($cookies, { cookieName: 'yunite-me-token' })).remove()
    expect(jar['yunite-me-token']).toBeUndefined()
    expect(jar[DEFAULT_COOKIE_NAME]).toBeUndefined()
    expect($cookies.remove).toHaveBeenCalledWith('yunite-me-token', { path: '/' })
  })
})

import { decode, sign } from 'jsonwebtoken'

import { isValidJwtExpires, resolveJwtExpires } from './jwtExpires'
import { SOFTWARE_DEFAULTS } from './softwareDefaults'

import type { JwtExpires } from './jwtExpires'
import type { JwtPayload } from 'jsonwebtoken'

const FALLBACK = SOFTWARE_DEFAULTS.JWT_EXPIRES // '2y'

// The lifetime a token minted with `expires` actually has, in seconds. Round-trips through the
// library rather than through our own parser, so these tests measure jsonwebtoken's behaviour.
const lifetimeOf = (expires: JwtExpires): number => {
  const payload = decode(sign({}, 'secret', { algorithm: 'HS256', expiresIn: expires })) as
    JwtPayload | undefined
  return (payload?.exp ?? 0) - (payload?.iat ?? 0)
}

describe('isValidJwtExpires', () => {
  it.each(['2y', '10 hours', '1.5h', '30m', '600'])('accepts the ms timespan %s', (value) => {
    expect(isValidJwtExpires(value)).toBe(true)
  })

  it.each([undefined, '', ' ', 'foo', '2 lightyears', 'y2', '.', '1.2.3'])(
    'rejects %s',
    (value) => {
      expect(isValidJwtExpires(value)).toBe(false)
    },
  )

  it('rejects a zero or negative lifetime, which ms parses but which mints a dead token', () => {
    expect(isValidJwtExpires('0')).toBe(false)
    expect(isValidJwtExpires('-1d')).toBe(false)
  })

  it('rejects an absurdly long value rather than handing it to the parser', () => {
    expect(isValidJwtExpires('9'.repeat(101))).toBe(false)
  })

  it('treats a unitless value as milliseconds, exactly as ms does', () => {
    // Deliberately NOT tightened: '600' is 600ms, so `exp` rounds down to a zero-second
    // lifetime. That is the library's documented semantics ("otherwise milliseconds is used"),
    // and rejecting it here would silently fall back for a deployment that legitimately
    // configures a lifetime in milliseconds. Whoever means 600 seconds writes '600s'.
    expect(isValidJwtExpires('600')).toBe(true)
    expect(lifetimeOf(resolveJwtExpires('600', FALLBACK))).toBe(0)
    expect(lifetimeOf(resolveJwtExpires('600s', FALLBACK))).toBe(600)
  })
})

describe('resolveJwtExpires', () => {
  it('keeps a parseable lifetime', () => {
    expect(resolveJwtExpires('10 hours', FALLBACK)).toBe('10 hours')
  })

  it('trims surrounding whitespace, which the library would otherwise reject', () => {
    expect(resolveJwtExpires(' 30m ', FALLBACK)).toBe('30m')
  })

  it.each([undefined, '', 'foo'])(
    'falls back for %s instead of throwing at token issuance',
    (value) => {
      expect(resolveJwtExpires(value, FALLBACK)).toBe(FALLBACK)
    },
  )

  it('falls back for a negative lifetime, which the library accepts as an expired token', () => {
    // The gap `|| default` leaves open: '-1d' is truthy and ms-parseable, so it would pass
    // straight through and every issued token would already be expired.
    expect(lifetimeOf('-1d')).toBeLessThan(0)
    expect(resolveJwtExpires('-1d', FALLBACK)).toBe(FALLBACK)
  })
})

describe('the resolved value against jsonwebtoken itself', () => {
  it.each([undefined, '', ' ', 'foo', '-1d', '0', '2 lightyears'])(
    'signs a token with a positive lifetime for JWT_EXPIRES=%s',
    (value) => {
      expect(lifetimeOf(resolveJwtExpires(value, FALLBACK))).toBeGreaterThan(0)
    },
  )

  it('rejects the raw values unresolved, which is what makes the boundary check necessary', () => {
    // The cast is the mistake under test: handing the env value straight to jwt.sign, which is
    // what the old `env.JWT_EXPIRES || default` did for any non-empty string.
    const signRaw = (value: string) =>
      sign({}, 'secret', { algorithm: 'HS256', expiresIn: value as JwtExpires })
    expect(() => signRaw('foo')).toThrow(/expiresIn/)
    expect(() => signRaw('')).toThrow(/expiresIn/)
  })

  it('has a software default that is itself a valid lifetime', () => {
    expect(isValidJwtExpires(SOFTWARE_DEFAULTS.JWT_EXPIRES)).toBe(true)
  })
})

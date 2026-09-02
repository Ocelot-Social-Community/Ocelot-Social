// The token lifetime (JWT_EXPIRES) as jsonwebtoken actually accepts it. From jsonwebtoken 9
// the `expiresIn` option is typed as `ms`'s StringValue — a template-literal union ('2y',
// '10 hours', …) — so a bare `string` off the environment no longer type-checks. Rather than
// cast the env value blind at the call site, it is VALIDATED here at the config boundary, the
// same way LANGUAGE_DEFAULT is resolved through ./locales: an unparseable value would only
// surface as a thrown error at token issuance, i.e. as a broken login on a running deployment.

import type { SignOptions } from 'jsonwebtoken'

// `number | StringValue` — derived from the signature so it tracks the library instead of
// restating it (`ms` is a transitive dependency and not imported directly here).
export type JwtExpires = NonNullable<SignOptions['expiresIn']>

// Number and unit are split by a deliberately loose pattern — no nested quantifiers, so it
// cannot backtrack (ReDoS) — and each half is then checked on its own: the amount through
// `Number` (which rejects '1.2.3' and '.') and the unit against the vocabulary below. `ms`'s
// own regex alternates both halves inside one pattern, which is neither.
const NUMBER_AND_UNIT = /^([0-9.]+) *([a-z]*)$/i

// The unit vocabulary of `ms`, which is what jsonwebtoken parses a string `expiresIn` with.
// The empty unit is included on purpose: a plain number string ('600') is milliseconds.
const MS_UNITS = new Set([
  '',
  'ms',
  'msec',
  'msecs',
  'millisecond',
  'milliseconds',
  's',
  'sec',
  'secs',
  'second',
  'seconds',
  'm',
  'min',
  'mins',
  'minute',
  'minutes',
  'h',
  'hr',
  'hrs',
  'hour',
  'hours',
  'd',
  'day',
  'days',
  'w',
  'week',
  'weeks',
  'y',
  'yr',
  'yrs',
  'year',
  'years',
])

// Whether a value is a token lifetime jsonwebtoken can parse. Empty and missing values are
// rejected, and so are zero and negative ones: `ms` parses '-1d', but it mints an
// already-expired token — a misconfiguration, not a lifetime.
export function isValidJwtExpires(value: string | undefined): boolean {
  if (!value || value.length > 100) {
    return false
  }
  const match = NUMBER_AND_UNIT.exec(value.trim())
  if (!match) {
    return false
  }
  const [, amount, unit] = match
  const parsed = Number(amount)
  return MS_UNITS.has(unit.toLowerCase()) && Number.isFinite(parsed) && parsed > 0
}

// Resolve a configured lifetime (JWT_EXPIRES) to one jsonwebtoken accepts, falling back to
// `fallback` for an empty, missing, or unparseable value — plain `|| default` lets 'foo' or
// '-1d' through, which then throws inside jwt.sign on every login.
export function resolveJwtExpires(value: string | undefined, fallback: string): JwtExpires {
  const resolved = isValidJwtExpires(value) ? (value as string).trim() : fallback
  // The one cast: StringValue is a template-literal union no regex match can narrow to, so the
  // runtime check above (and jwtExpires.spec.ts, which asserts the fallback passes it) is what
  // makes this sound.
  return resolved as JwtExpires
}

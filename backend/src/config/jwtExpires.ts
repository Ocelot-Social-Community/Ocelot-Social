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

// The unit vocabulary of `ms` — what jsonwebtoken parses a string `expiresIn` with — mapped to
// its millisecond factor, so the effective lifetime can be measured here. The empty unit is in
// the map on purpose: a plain number string ('600') is milliseconds. The year factor is 365.25
// days, matching `ms`.
const MS_UNITS = new Map([
  ['', 1],
  ['ms', 1],
  ['msec', 1],
  ['msecs', 1],
  ['millisecond', 1],
  ['milliseconds', 1],
  ['s', 1000],
  ['sec', 1000],
  ['secs', 1000],
  ['second', 1000],
  ['seconds', 1000],
  ['m', 60_000],
  ['min', 60_000],
  ['mins', 60_000],
  ['minute', 60_000],
  ['minutes', 60_000],
  ['h', 3_600_000],
  ['hr', 3_600_000],
  ['hrs', 3_600_000],
  ['hour', 3_600_000],
  ['hours', 3_600_000],
  ['d', 86_400_000],
  ['day', 86_400_000],
  ['days', 86_400_000],
  ['w', 604_800_000],
  ['week', 604_800_000],
  ['weeks', 604_800_000],
  ['y', 31_557_600_000],
  ['yr', 31_557_600_000],
  ['yrs', 31_557_600_000],
  ['year', 31_557_600_000],
  ['years', 31_557_600_000],
])

// One second is the floor, not zero: jsonwebtoken sets `exp = iat + Math.floor(ms(value)/1000)`,
// so any lifetime under a second yields exp === iat, and jwt.verify rejects such a token as
// expired the instant it was signed ('600' is 600ms, not 600 seconds — whoever means the latter
// writes '600s'). A lifetime at or above a second in milliseconds ('86400000') still passes.
const MIN_LIFETIME_MS = 1000

// Whether a value is a token lifetime jsonwebtoken can both parse AND mint a usable token from.
// Empty, missing and unparseable values are rejected, as are negative, zero and sub-second ones.
export function isValidJwtExpires(value: string | undefined): boolean {
  if (!value || value.length > 100) {
    return false
  }
  const match = NUMBER_AND_UNIT.exec(value.trim())
  if (!match) {
    return false
  }
  const [, amount, unit] = match
  const factor = MS_UNITS.get(unit.toLowerCase())
  const parsed = Number(amount)
  if (factor === undefined || !Number.isFinite(parsed)) {
    return false
  }
  return parsed * factor >= MIN_LIFETIME_MS
}

// Resolve a configured lifetime (JWT_EXPIRES) to one jsonwebtoken accepts, falling back to
// `fallback` for an empty, missing, unparseable or unusably short value — plain `|| default`
// lets 'foo' through (which throws inside jwt.sign on every login) as well as '-1d' and '600'
// (which mint a token every verify rejects as already expired).
export function resolveJwtExpires(value: string | undefined, fallback: string): JwtExpires {
  const resolved = isValidJwtExpires(value) ? (value as string).trim() : fallback
  // The one cast: StringValue is a template-literal union no regex match can narrow to, so the
  // runtime check above (and jwtExpires.spec.ts, which asserts the fallback passes it) is what
  // makes this sound.
  return resolved as JwtExpires
}

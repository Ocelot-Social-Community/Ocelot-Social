// Patterns shared by several entities.
//
// Every pattern here is read TWICE: by ajv as a JavaScript regex (write- and read-path
// validation) and by Cypher's `=~` as a Java regex (audit queries, and any APOC trigger we
// might add later). Only constructs both dialects agree on are allowed — no lookbehind, no
// named groups, and none of the class shorthands, because they are where the two silently
// disagree. schema.spec.ts rejects those shorthands; patternParity.spec.ts runs every pattern
// through a real Neo4j and a JS RegExp side by side and requires the same answer.

/** Lowercase slug as produced by the slugify middleware. Mirrors db/models/User.ts. */
export const SLUG = '^[a-z0-9_-]+$'

/**
 * ISO 8601 date-time, as written by BOTH writers in this codebase:
 *
 *   - JavaScript `new Date().toISOString()` -> always three fractional digits: `…:40.210Z`
 *   - Cypher `toString(datetime())`          -> trailing zeros dropped: `…:40.21Z`
 *
 * The first audit run against seeded data found 786 Message, 13 Room and 5 Group nodes whose
 * `createdAt` failed a three-digit-only pattern. They are not malformed — they come from the
 * other writer. The fraction is therefore optional and variable-length, and an explicit
 * offset is accepted next to `Z`.
 */
export const ISO_DATE_TIME =
  '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,9})?(Z|[+-][0-9]{2}:[0-9]{2})$'

/**
 * Every character ECMAScript's `\s` matches, spelled out — for use inside a character class.
 *
 * `\s` itself is unusable here: ECMAScript defines it over Unicode, Java over ASCII, so
 * `[^@\s]` excludes U+00A0 for ajv and admits it for Cypher. Measured, not assumed — with the
 * shorthand, `a<NBSP>b@example.org` failed the write-path validation and passed the audit,
 * which is the audit missing exactly the values it exists to find. The same held for U+2028,
 * U+2029 and U+FEFF.
 *
 * U+000B is spelled by code point rather than as `\v`: ECMAScript reads that as the single
 * vertical tab, Java as a whole vertical-whitespace class. `\t\n\f\r` mean the same in both.
 */
const WHITESPACE =
  '\\t\\n\\f\\r \\u000b\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff'

/**
 * Deliberately permissive: local part, `@`, a dotted domain. neode used Joi's `email: true`;
 * ajv offers no format checking without ajv-formats, and rejecting a valid address is worse
 * than accepting an odd one — delivery is the real validator.
 */
export const EMAIL = `^[^@${WHITESPACE}]+@[^@.${WHITESPACE}]+([.][^@.${WHITESPACE}]+)+$`

/**
 * A URI with an explicit scheme: `https://example.org`, `mailto:someone@example.org`.
 *
 * Replaces neode's Joi `uri: true` on SocialMedia.url. Deliberately not a full RFC 3986
 * grammar — the rule that matters is "a scheme and something after it", which is what
 * separates a link a browser can follow from the string `not-a-url`.
 */
export const URI = `^[a-zA-Z][a-zA-Z0-9+.-]*:[^${WHITESPACE}]+$`

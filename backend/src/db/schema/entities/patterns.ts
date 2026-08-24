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
 * A web address the UI may put in an `href`: `http://example.org`, `https://example.org/x`.
 *
 * An ALLOWLIST of two schemes, not "a scheme and something after it". The permissive version
 * this replaces — neode's Joi `uri: true`, transcribed as `^[a-zA-Z][a-zA-Z0-9+.-]*:…` —
 * accepted `javascript:alert(document.cookie)`, `data:text/html;base64,…`, `vbscript:` and
 * `file:///etc/passwd`. SocialMedia.url is rendered by the webapp as
 * `<a :href="link.url">` on a user's PUBLIC profile, and Vue does not sanitise an href
 * binding, so a stored `javascript:` URL runs in the browser of whoever clicks it. An
 * allowlist is the only form of this rule that cannot be talked around by the next scheme
 * nobody thought of.
 *
 * The scheme is spelled letter by letter rather than with a case-insensitive flag: `(?i)` is
 * Java-only and ajv compiles the pattern without flags, so it would match `JavaScript:` in
 * one engine and not the other — see patternParity.spec.ts. `jaVaScRiPt:` has to be rejected
 * by both, and a browser reads schemes case-insensitively.
 *
 * `mailto:` is deliberately absent. This is the constraint on social-media profile links, and
 * the component derives a favicon from the host — an address has none. Should a field ever
 * need it, that is a second, differently named pattern, not a widening of this one.
 */
export const HTTP_URL = `^[hH][tT][tT][pP][sS]?://[^${WHITESPACE}]+$`

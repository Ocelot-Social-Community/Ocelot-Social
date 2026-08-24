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
 * The address inside a `mailto:` — deliberately NOT the same rule as EMAIL.
 *
 * `?` opens the query part of a mailto url and `,` separates recipients, so neither can be
 * part of the address here. On its own an address may contain both: RFC 5322 puts `?` in
 * atext, and EMAIL accordingly allows it. The two rules answer different questions — EMAIL
 * asks whether a string is an address, this asks where an address ENDS.
 *
 * That boundary is the whole point. `mailto:someone@example.org?bcc=elsewhere@example.tld`
 * is a valid mailto, and clicking it opens a composer with a recipient the reader never saw;
 * `?subject=` and `?body=` pre-fill a message they never wrote. A social-media link publishes
 * a way to REACH someone, so it carries an address and nothing else.
 *
 * `%` is excluded so that this rule and the webapp's read the same characters. A url may
 * percent-encode any of them, and the two sides then disagree about what they are looking at:
 * this pattern sees the stored string, the webapp parses it, and a parser decodes. Measured
 * over one corpus (webapp/utils/followableUrl.spec.js carries it), the encoded forms diverged
 * every time — `mailto:a@example%2Eorg` was an undotted domain here and a dotted one there,
 * `mailto:a b@example.org` was whitespace here and a legal address there, and
 * `mailto:a@example.org%0A` passed BOTH and rendered a label with a newline in it. A regex
 * cannot decode and Cypher has no function that would, so the fix is to accept no encoded
 * octets at all. Nothing is lost: every character an address may legitimately carry here can
 * be written literally, and the ones that cannot are the ones this rule already refuses.
 */
const MAILTO_ADDRESS = `[^@,?%${WHITESPACE}]+@[^@.,?%${WHITESPACE}]+([.][^@.,?%${WHITESPACE}]+)+`

/**
 * A url this application will put in an `href`: `https://example.org/x`, `http://example.org`,
 * `mailto:someone@example.org`.
 *
 * An ALLOWLIST of schemes, not "a scheme and something after it". The permissive version this
 * replaces — neode's Joi `uri: true`, transcribed as `^[a-zA-Z][a-zA-Z0-9+.-]*:…` — accepted
 * `javascript:alert(document.cookie)`, `data:text/html;base64,…`, `vbscript:` and
 * `file:///etc/passwd`. SocialMedia.url is rendered by the webapp as `<a :href="link.url">` on
 * a user's PUBLIC profile, and Vue does not sanitise an href binding, so a stored
 * `javascript:` url runs in the browser of whoever clicks it. An allowlist is the only form of
 * this rule that cannot be talked around by the next scheme nobody thought of.
 *
 * Every scheme is spelled letter by letter rather than with a case-insensitive flag: `(?i)` is
 * Java-only and ajv compiles the pattern without flags, so it would match `JavaScript:` in one
 * engine and not the other — see patternParity.spec.ts. `jaVaScRiPt:` has to be rejected by
 * both, and a browser reads schemes case-insensitively.
 *
 * `mailto:` earns its place because an address is something a reader can act on and a browser
 * can hand to a mail client. It costs the UI a case of its own: a mail address has no host, so
 * there is no favicon to fetch from one, and the profile card shows an envelope instead
 * (webapp/components/SocialMedia). And it is worth saying out loud that a mailto here PUBLISHES
 * that address on a page open to everyone — the primary address of an account is protected,
 * one typed into this field is not.
 */
export const FOLLOWABLE_URL =
  `^([hH][tT][tT][pP][sS]?://[^${WHITESPACE}]+` + `|[mM][aA][iI][lL][tT][oO]:${MAILTO_ADDRESS})$`

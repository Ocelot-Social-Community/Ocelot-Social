// Patterns shared by several entities.
//
// Every pattern here is read TWICE: by ajv as a JavaScript regex (write- and read-path
// validation) and by Cypher's `=~` as a Java regex (audit queries, and any APOC trigger we
// might add later). Only constructs both dialects agree on are allowed — no lookbehind, no
// `\d` with unicode semantics, no named groups. schema.spec.ts guards this by running each
// pattern through both a JS RegExp and the audit query.

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
 * Deliberately permissive: local part, `@`, a dotted domain. neode used Joi's `email: true`;
 * ajv offers no format checking without ajv-formats, and rejecting a valid address is worse
 * than accepting an odd one — delivery is the real validator.
 */
export const EMAIL = '^[^@\\s]+@[^@\\s.]+([.][^@\\s.]+)+$'

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
 * ISO 8601 date-time as `new Date().toISOString()` writes it, which is what every
 * `isoDate: true` property in the neode models actually contains. Deliberately stricter
 * than ISO 8601 in general: we want drift from that one writer to show up.
 */
export const ISO_DATE_TIME = '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$'

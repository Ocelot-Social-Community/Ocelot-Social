// Single source of truth for the "software default" of every environment variable
// that has one — the code baseline a var falls back to when unset. Two consumers
// must agree on these values, and previously each held its own copy:
//   - config/index.ts, which applies the fallback at runtime, and
//   - config/envRegistry.ts, which surfaces it as the admin "software default" column.
// A change in one used to silently make the other wrong. Both now derive from this
// map instead, so the value lives in ONE place.
//
// Values are typed as they are consumed by config/index.ts (string / number /
// boolean); envRegistry stringifies them for display. The inverted-boolean flags
// (SMTP_IGNORE_TLS, SMTP_SECURE, SMTP_REJECT_UNAUTHORIZED, PRODUCTION_DB_CLEAN_ALLOW)
// keep their comparison logic in config/index.ts — their DEFAULT is recorded here and
// guarded against drift by softwareDefaults.spec.ts.

export const SOFTWARE_DEFAULTS = {
  // --- Server ---
  CLIENT_URI: 'http://localhost:3000',
  GRAPHQL_URI: 'http://localhost:4000',
  JWT_EXPIRES: '2y',
  // --- Database ---
  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USERNAME: 'neo4j',
  NEO4J_PASSWORD: 'neo4j',
  // --- Mail / SMTP ---
  SMTP_IGNORE_TLS: true,
  SMTP_SECURE: false,
  SMTP_MAX_CONNECTIONS: 5,
  SMTP_MAX_MESSAGES: 100,
  SMTP_REJECT_UNAUTHORIZED: true,
  // --- General ---
  PRODUCTION_DB_CLEAN_ALLOW: false,
  LANGUAGE_DEFAULT: 'en',
} as const

export type SoftwareDefaultKey = keyof typeof SOFTWARE_DEFAULTS

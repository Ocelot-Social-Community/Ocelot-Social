// Single source of truth for the "software default" of every environment variable
// that has one — the code baseline a var falls back to when unset. Two consumers
// must agree on these values, and previously each held its own copy:
//   - config/index.ts, which applies the fallback at runtime, and
//   - config/envRegistry.ts, which surfaces it as the admin "software default" column.
// A change in one used to silently make the other wrong. Both now derive from this
// map instead, so the value lives in ONE place.
//
// Values are typed as they are consumed by config/index.ts (string / number / boolean /
// list); envRegistry stringifies them for display (String([]) === '' — the natural empty
// display for the comma-list vars). Vars whose default lives in comparison / NODE_ENV logic
// rather than a `?? const` fallback (the SMTP flags, PRODUCTION_DB_CLEAN_ALLOW, DEBUG,
// DISABLED_MIDDLEWARES) still record their DEFAULT here so it is single-sourced for display;
// softwareDefaults.spec.ts guards each against drift with config's actual unset default.
// DEBUG is special: its unset value is NODE_ENV-gated (undefined in non-production, false in
// production), so it is guarded as "falsy" rather than strictly `false`.

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
  // Off by default (and forced off in production); NODE_ENV-gated, so its unset value is
  // falsy rather than strictly false.
  DEBUG: false,
  // No middlewares disabled by default — the empty list displays as '' (String([])).
  DISABLED_MIDDLEWARES: [] as readonly string[],
  LANGUAGE_DEFAULT: 'en',
  // --- Contact / organisation (per-deployment identity) ---
  // Scalar identity values a deployment overrides via env (surfaced read-only in the admin
  // env tab, NOT policy-overridable). The env var name is SUPPORT_LINK / ORGANIZATION_LINK;
  // config/index.ts exposes them under the CONFIG keys SUPPORT_URL / ORGANIZATION_URL.
  SUPPORT_EMAIL: 'hello@ocelot.social',
  SUPPORT_LINK: 'https://ocelot.social',
  ORGANIZATION_LINK: 'https://ocelot.social',
} as const

export type SoftwareDefaultKey = keyof typeof SOFTWARE_DEFAULTS

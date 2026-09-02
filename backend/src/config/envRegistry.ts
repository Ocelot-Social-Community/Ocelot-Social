// Declarative registry of every environment variable this deployment recognises,
// feeding the admin "environment configuration" tab. It is the single source of
// truth for a var's SECRET flag (whether its value may be surfaced), its display
// CATEGORY, and its software default. The dynamic value layers (effective value,
// policy override, presence state) are folded in at query time by systemConfig.ts —
// this file carries only static metadata.
//
// Scope: infrastructure vars read in config/index.ts plus the LiveKit vars a policy
// hard-requires (kept here so their secret flag lives in ONE place). The policy
// SEED vars (PUBLIC_REGISTRATION, API_KEYS_ENABLED, …) are intentionally NOT listed
// — they are derived from the policy schema to avoid drift; see POLICY_CATEGORY.
//
// Secret hygiene: a var missing from this registry defaults to secret=true in
// systemConfig.ts, so a newly introduced var can never leak its value by omission.

import { resolveJwtExpires } from './jwtExpires'
import { resolveLocale } from './locales'
import { SOFTWARE_DEFAULTS } from './softwareDefaults'

// The category vocabulary (display groups on the config tab) lives in ./categories so the
// policy schema can validate each key's `category` against the same source.
import type { EnvCategory } from './categories'

export interface EnvVarSpec {
  // The environment variable name (e.g. NEO4J_URI).
  name: string
  // Whether the value is sensitive. A secret is reported by presence only — its
  // value is never returned to the client and it has no software default shown.
  secret: boolean
  // Display grouping on the admin config tab.
  category: EnvCategory
  // The code baseline the value falls back to when the var is unset, as a display
  // string, or null when there is none. This is a PUBLIC code constant (not a deployed
  // secret), so it is surfaced even for a secret var — only the runtime env value is hidden.
  softwareDefault: string | null
  // Whether the var is a comma-separated list. Its runtime value and default are surfaced as
  // a JSON array (so an empty list reads as [] and a set one as ["a","b"], not a bare string).
  list?: boolean
  // Optional resolver mapping the RAW env value (undefined when unset) to the value actually
  // in operation, for a var VALIDATED at the config boundary — e.g. LANGUAGE_DEFAULT is checked
  // against the supported locales and falls back. The admin config tab shows this as the
  // effective value, so an invalid/empty env value ('xx' / '') displays as its resolved
  // fallback ('en') — matching the runtime — while the raw env value stays visible in its own
  // column. Omit for a var whose effective value is simply "env value, else software default".
  normalize?: (raw: string | undefined) => string
}

// Every recognised env var except the policy-seed vars. Kept in lockstep with the reads
// in config/index.ts — enforced by envRegistry.spec.ts, which fails if the runtime reads a
// var this registry omits (or declares one nothing reads).
export const ENV_REGISTRY: EnvVarSpec[] = [
  // --- Server -------------------------------------------------------------
  { name: 'NODE_ENV', secret: false, category: 'server', softwareDefault: null },
  {
    name: 'CLIENT_URI',
    secret: false,
    category: 'server',
    softwareDefault: SOFTWARE_DEFAULTS.CLIENT_URI,
  },
  {
    name: 'GRAPHQL_URI',
    secret: false,
    category: 'server',
    softwareDefault: SOFTWARE_DEFAULTS.GRAPHQL_URI,
  },

  // --- Database -----------------------------------------------------------
  {
    name: 'NEO4J_URI',
    secret: false,
    category: 'database',
    softwareDefault: SOFTWARE_DEFAULTS.NEO4J_URI,
  },
  {
    name: 'NEO4J_USERNAME',
    secret: false,
    category: 'database',
    softwareDefault: SOFTWARE_DEFAULTS.NEO4J_USERNAME,
  },
  // A software default is a PUBLIC code constant (config/index.ts), not the deployed
  // secret — so it is shown even for a secret var. Only the runtime env VALUE is hidden.
  {
    name: 'NEO4J_PASSWORD',
    secret: true,
    category: 'database',
    softwareDefault: SOFTWARE_DEFAULTS.NEO4J_PASSWORD,
  },
  // Which constraint classes the graph backend can enforce, and therefore how much of
  // src/db/schema the migration init installs. Community Neo4j holds uniqueness only;
  // Enterprise adds existence constraints, Memgraph those plus data types. Everything a
  // profile cannot enforce is covered by the audit queries instead.
  {
    name: 'NEO4J_PROFILE',
    secret: false,
    category: 'database',
    softwareDefault: SOFTWARE_DEFAULTS.NEO4J_PROFILE,
  },

  // --- Mail / SMTP --------------------------------------------------------
  { name: 'EMAIL_DEFAULT_SENDER', secret: false, category: 'mail', softwareDefault: null },
  {
    name: 'SUPPORT_EMAIL',
    secret: false,
    category: 'mail',
    softwareDefault: SOFTWARE_DEFAULTS.SUPPORT_EMAIL,
  },
  { name: 'SMTP_HOST', secret: false, category: 'mail', softwareDefault: null },
  { name: 'SMTP_PORT', secret: false, category: 'mail', softwareDefault: null },
  {
    name: 'SMTP_IGNORE_TLS',
    secret: false,
    category: 'mail',
    softwareDefault: String(SOFTWARE_DEFAULTS.SMTP_IGNORE_TLS),
  },
  {
    name: 'SMTP_SECURE',
    secret: false,
    category: 'mail',
    softwareDefault: String(SOFTWARE_DEFAULTS.SMTP_SECURE),
  },
  { name: 'SMTP_USERNAME', secret: false, category: 'mail', softwareDefault: null },
  { name: 'SMTP_PASSWORD', secret: true, category: 'mail', softwareDefault: null },
  { name: 'SMTP_DKIM_DOMAINNAME', secret: false, category: 'mail', softwareDefault: null },
  { name: 'SMTP_DKIM_KEYSELECTOR', secret: false, category: 'mail', softwareDefault: null },
  { name: 'SMTP_DKIM_PRIVATEKEY', secret: true, category: 'mail', softwareDefault: null },
  {
    name: 'SMTP_MAX_CONNECTIONS',
    secret: false,
    category: 'mail',
    softwareDefault: String(SOFTWARE_DEFAULTS.SMTP_MAX_CONNECTIONS),
  },
  {
    name: 'SMTP_MAX_MESSAGES',
    secret: false,
    category: 'mail',
    softwareDefault: String(SOFTWARE_DEFAULTS.SMTP_MAX_MESSAGES),
  },
  {
    name: 'SMTP_REJECT_UNAUTHORIZED',
    secret: false,
    category: 'mail',
    softwareDefault: String(SOFTWARE_DEFAULTS.SMTP_REJECT_UNAUTHORIZED),
  },

  // --- Storage / S3 -------------------------------------------------------
  { name: 'PROXY_S3', secret: false, category: 'storage', softwareDefault: null },
  // The access key ID is an identifier (paired with the secret access key below),
  // shown for diagnostics; only the secret access key is hidden.
  { name: 'AWS_ACCESS_KEY_ID', secret: false, category: 'storage', softwareDefault: null },
  { name: 'AWS_SECRET_ACCESS_KEY', secret: true, category: 'storage', softwareDefault: null },
  { name: 'AWS_ENDPOINT', secret: false, category: 'storage', softwareDefault: null },
  { name: 'AWS_REGION', secret: false, category: 'storage', softwareDefault: null },
  { name: 'AWS_BUCKET', secret: false, category: 'storage', softwareDefault: null },
  { name: 'IMAGOR_PUBLIC_URL', secret: false, category: 'storage', softwareDefault: null },
  { name: 'IMAGOR_SECRET', secret: true, category: 'storage', softwareDefault: null },

  // --- Auth ---------------------------------------------------------------
  { name: 'JWT_SECRET', secret: true, category: 'auth', softwareDefault: null },
  {
    name: 'JWT_EXPIRES',
    secret: false,
    category: 'auth',
    softwareDefault: SOFTWARE_DEFAULTS.JWT_EXPIRES,
    // Validated as an `ms` lifetime (same as config/index.ts), so the config tab's effective
    // value matches the runtime: an empty or unparseable JWT_EXPIRES resolves to the software
    // default rather than being shown verbatim.
    normalize: (raw) => String(resolveJwtExpires(raw, SOFTWARE_DEFAULTS.JWT_EXPIRES)),
  },

  // --- Maps ---------------------------------------------------------------
  { name: 'MAPBOX_TOKEN', secret: true, category: 'maps', softwareDefault: null },

  // --- Video (LiveKit) — hard-required by the videoConference policy -------
  { name: 'LIVEKIT_URL', secret: false, category: 'video', softwareDefault: null },
  { name: 'LIVEKIT_API_KEY', secret: true, category: 'video', softwareDefault: null },
  { name: 'LIVEKIT_API_SECRET', secret: true, category: 'video', softwareDefault: null },

  // --- Redis --------------------------------------------------------------
  { name: 'REDIS_DOMAIN', secret: false, category: 'redis', softwareDefault: null },
  { name: 'REDIS_PORT', secret: false, category: 'redis', softwareDefault: null },
  { name: 'REDIS_PASSWORD', secret: true, category: 'redis', softwareDefault: null },

  // --- Monitoring ---------------------------------------------------------
  // A DSN can embed a project key → treated as a secret.
  { name: 'SENTRY_DSN_BACKEND', secret: true, category: 'monitoring', softwareDefault: null },
  { name: 'COMMIT', secret: false, category: 'monitoring', softwareDefault: null },

  // --- General ------------------------------------------------------------
  // Off by default (a boolean toggle, only on in non-production when explicitly set, forced
  // off in production) → baseline 'false', not "no default". Single-sourced from the map.
  {
    name: 'DEBUG',
    secret: false,
    category: 'general',
    softwareDefault: String(SOFTWARE_DEFAULTS.DEBUG),
  },
  {
    name: 'PRODUCTION_DB_CLEAN_ALLOW',
    secret: false,
    category: 'general',
    softwareDefault: String(SOFTWARE_DEFAULTS.PRODUCTION_DB_CLEAN_ALLOW),
  },
  // A comma-separated list; shown as a JSON array so the empty default reads as [] and a set
  // value as ["m_a","m_b"] rather than a bare/blank string.
  {
    name: 'DISABLED_MIDDLEWARES',
    secret: false,
    category: 'general',
    list: true,
    softwareDefault: JSON.stringify(SOFTWARE_DEFAULTS.DISABLED_MIDDLEWARES),
  },
  // Contact / organisation identity links (env var names SUPPORT_LINK / ORGANIZATION_LINK;
  // exposed under the CONFIG keys SUPPORT_URL / ORGANIZATION_URL).
  {
    name: 'SUPPORT_LINK',
    secret: false,
    category: 'general',
    softwareDefault: SOFTWARE_DEFAULTS.SUPPORT_LINK,
  },
  {
    name: 'ORGANIZATION_LINK',
    secret: false,
    category: 'general',
    softwareDefault: SOFTWARE_DEFAULTS.ORGANIZATION_LINK,
  },
  {
    name: 'LANGUAGE_DEFAULT',
    secret: false,
    category: 'general',
    softwareDefault: SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT,
    // Validated against the supported locales (same as config/index.ts), so the config tab's
    // effective value matches the runtime: an empty or invalid LANGUAGE_DEFAULT resolves to the
    // software default rather than being shown verbatim.
    normalize: (raw) => resolveLocale(raw, SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT),
  },
]

// A policy key's env-row category is no longer mapped here — each key declares its own
// `category` in policy.schema.json (read via categoryFor), so there is one definition per
// key and no separate table to keep in sync.

// Fast lookup of a var's metadata by name. Used by systemConfig.ts to resolve the
// secret flag / category of a policy's hard-required env var.
export const ENV_SPEC_BY_NAME: Record<string, EnvVarSpec> = Object.fromEntries(
  ENV_REGISTRY.map((spec) => [spec.name, spec]),
)

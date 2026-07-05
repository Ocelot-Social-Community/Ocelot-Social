// Schema accessors. The canonical schema lives at ./policy.schema.json — keep
// ./types.ts in sync with it (defaults are read from the JSON at runtime, so
// type-level drift is the only concern).

// Loading the canonical JSON schema synchronously at module init is intentional
// (resolveJsonModule is off project-wide; the build copies the .json next to this
// file). require() is the established pattern for static config in this codebase.
/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-commonjs, n/global-require */
/* eslint-disable security/detect-object-injection */ // keys come from the fixed schema, never user input
import { Ajv } from 'ajv'

import { ENV_CATEGORIES } from '@src/config/categories'

import {
  AUTHENTICATED_AUDIENCE,
  KNOWN_AUDIENCES,
  PERMISSION_AUDIENCE_PREFIX,
  PUBLIC_AUDIENCE,
} from './types'

import type { Audience, NetworkPolicy, PolicyKey } from './types'
import type { EnvCategory } from '@src/config/categories'
import type { ValidateFunction } from 'ajv'

interface RawProperty {
  type: string
  default: unknown
  minimum?: number
  description?: string
  visibility?: Audience[]
  envSeed?: string
  requiresEnv?: string[]
  // The admin config-tab display group. Declared per key, enum-validated at schema compile;
  // read via categoryFor (which throws if a key omitted it). Optional in this type only so
  // that missing-category check is expressible — every key must declare one.
  category?: EnvCategory
}

interface RawSchema {
  properties: Record<string, RawProperty>
}

const rawSchema = require('./policy.schema.json') as RawSchema

export function allKeys(): PolicyKey[] {
  return Object.keys(rawSchema.properties) as PolicyKey[]
}

export function defaultFor<K extends PolicyKey>(key: K): NetworkPolicy[K] {
  return rawSchema.properties[key].default as NetworkPolicy[K]
}

export function envSeedFor(key: PolicyKey): string | undefined {
  return rawSchema.properties[key].envSeed
}

// The env vars a key HARD-requires to be effective (distinct from envSeed, which
// only seeds the default). Empty/undefined ⇒ no env dependency. Used to fold env
// availability into the policy's effective value and to surface it in the admin UI.
export function requiresEnvFor(key: PolicyKey): string[] {
  // Copy so a caller's push/splice can't mutate the shared schema array and
  // silently alter isAvailable/getEffective network-wide.
  return [...(rawSchema.properties[key].requiresEnv ?? [])]
}

export function typeFor(key: PolicyKey): string {
  return rawSchema.properties[key].type
}

// The admin config-tab display group for a key. Single source: the key's own `category` in
// the schema (the former POLICY_CATEGORY map is gone). Throws if a key forgot to declare
// one — surfaced where the category is actually read, rather than silently mis-grouping it
// in the admin UI. (When present, the value is enum-validated against ENV_CATEGORIES at
// schema compile above; schema.spec exercises categoryFor over every key as a CI guard.)
export function categoryFor(key: PolicyKey): EnvCategory {
  const category = rawSchema.properties[key].category
  if (category === undefined) {
    throw new Error(`policy.schema.json: key "${key}" is missing a "category"`)
  }
  return category
}

// --- Value validation (Ajv) ------------------------------------------------
// Per-key validators compiled once from the schema. Run in `strict: true` mode
// so schema-authoring mistakes (typo'd / unknown keywords, wrong shapes) fail
// fast at module load. The custom annotation keywords are registered as known
// AND their values are validated: `visibility` must be an array of KNOWN_AUDIENCES
// (so a typo'd audience — which would silently make a key match nobody — is caught
// at module load), `envSeed` a string. A future custom keyword (e.g. licenseRequired)
// MUST be registered here too, otherwise strict mode rejects the schema.
// These keywords carry metadata only (no `validate`/`code`), so they never
// affect data validation — only type and constraints (e.g. `minimum`) do that.
const ajv = new Ajv({ strict: true })
ajv.addKeyword({
  keyword: 'visibility',
  metaSchema: { type: 'array', items: { type: 'string', enum: KNOWN_AUDIENCES } },
})
ajv.addKeyword({ keyword: 'envSeed', metaSchema: { type: 'string' } })
ajv.addKeyword({
  keyword: 'requiresEnv',
  metaSchema: { type: 'array', items: { type: 'string' } },
})
// `category` must be one of the known display groups — a typo'd category (which would put
// the key in a phantom admin-config group) is rejected at module load.
ajv.addKeyword({
  keyword: 'category',
  metaSchema: { type: 'string', enum: [...ENV_CATEGORIES] },
})
const validators = Object.fromEntries(
  allKeys().map((key) => [key, ajv.compile(rawSchema.properties[key])]),
) as Record<PolicyKey, ValidateFunction>

// Validate a value for a key against its schema (type + constraints). Returns
// true if valid, otherwise a human-readable error message.
export function validatePolicyValue(key: PolicyKey, value: unknown): true | string {
  const validate = validators[key]
  if (validate(value)) return true
  return ajv.errorsText(validate.errors, { dataVar: key })
}

// --- Visibility: permission-based membership ------------------------------
// The whole "who may see what" mechanism is three small functions. Both the
// `policy` query resolver and the policyChanged subscription filter go through
// canView() — it is the single source of truth for visibility.

// Minimal viewer shape: the auth state plus the viewer's effective permission
// keys (the request context resolves these from the user's roles). No role name
// is read here — visibility keys on permissions, not on dynamic role names.
export interface PolicyViewer {
  authenticated: boolean
  permissions?: Iterable<string>
}

// Admin-only keys (empty/missing visibility) resolve to this permission audience,
// so owner/admin — who hold policy.manage in their effective permission set — see
// them, with no special superuser short-circuit needed.
const ADMIN_ONLY_AUDIENCE: Audience = `${PERMISSION_AUDIENCE_PREFIX}policy.manage`

// The audiences a key is visible to. Empty/missing ⇒ admin-only (policy.manage).
// Returns a COPY: the value is a shared reference into the loaded schema
// singleton, so a caller mutating it (push/splice) would otherwise silently
// alter the effective visibility process-wide and could weaken canView().
export function audiencesFor(key: PolicyKey): Audience[] {
  const visibility = rawSchema.properties[key].visibility
  return visibility && visibility.length > 0 ? [...visibility] : [ADMIN_ONLY_AUDIENCE]
}

// The audiences a viewer belongs to. 'public' is universal (every viewer,
// including anonymous). The 'authenticated' audience and every 'perm:<key>'
// audience are gated on the auth status: an anonymous viewer holds none, even if
// an inconsistent upstream context were to carry permissions. This keeps canView()
// a safe single source of truth (no permission leak without authentication).
export function audiencesOf(viewer: PolicyViewer | null | undefined): Set<Audience> {
  const audiences = new Set<Audience>([PUBLIC_AUDIENCE])
  if (viewer?.authenticated) {
    audiences.add(AUTHENTICATED_AUDIENCE)
    for (const permission of viewer.permissions ?? []) {
      audiences.add(`${PERMISSION_AUDIENCE_PREFIX}${permission}`)
    }
  }
  return audiences
}

// The single visibility primitive: a viewer sees a key iff they share at least
// one audience with it. Owner/admin "see everything" simply because their
// effective permission set covers every key's permission audience.
export function canView(key: PolicyKey, viewer: PolicyViewer | null | undefined): boolean {
  const viewerAudiences = audiencesOf(viewer)
  return audiencesFor(key).some((audience) => viewerAudiences.has(audience))
}

// All keys a viewer may see.
export function visibleKeys(viewer: PolicyViewer | null | undefined): PolicyKey[] {
  return allKeys().filter((key) => canView(key, viewer))
}

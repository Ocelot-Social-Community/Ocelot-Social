// Schema accessors. The canonical schema lives at ./policy.schema.json — keep
// ./types.ts in sync with it (defaults are read from the JSON at runtime, so
// type-level drift is the only concern).

// Loading the canonical JSON schema synchronously at module init is intentional
// (resolveJsonModule is off project-wide; the build copies the .json next to this
// file). require() is the established pattern for static config in this codebase.
/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-commonjs, n/global-require */
/* eslint-disable security/detect-object-injection */ // keys come from the fixed schema, never user input
import { Ajv } from 'ajv'

import { ADMIN_AUDIENCE, AUTHENTICATED_AUDIENCE, PUBLIC_AUDIENCE } from './types'

import type { Audience, NetworkPolicy, PolicyKey } from './types'
import type { ValidateFunction } from 'ajv'

interface RawProperty {
  type: string
  default: unknown
  minimum?: number
  description?: string
  'x-visibility'?: Audience[]
  'x-envSeed'?: string
}

interface RawSchema {
  properties: Record<string, RawProperty>
  required?: string[]
}

const rawSchema = require('./policy.schema.json') as RawSchema

export function allKeys(): PolicyKey[] {
  return Object.keys(rawSchema.properties) as PolicyKey[]
}

export function defaultFor<K extends PolicyKey>(key: K): NetworkPolicy[K] {
  return rawSchema.properties[key].default as NetworkPolicy[K]
}

export function envSeedFor(key: PolicyKey): string | undefined {
  return rawSchema.properties[key]['x-envSeed']
}

export function typeFor(key: PolicyKey): string {
  return rawSchema.properties[key].type
}

// --- Value validation (Ajv) ------------------------------------------------
// Per-key validators compiled once from the schema. `strict: false` lets the
// custom annotation keywords (x-visibility, x-envSeed) pass through instead of
// being rejected. This enforces the FULL schema for a key — type AND constraints
// such as `minimum` — replacing the former hand-rolled type-only check.
const ajv = new Ajv({ strict: false })
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

// --- Visibility: membership-based, not rank-based -------------------------
// The whole "who may see what" mechanism is three small functions. Both the
// `policy` query resolver and the policyChanged subscription filter go through
// canView() — it is the single source of truth for visibility.

// Minimal viewer shape — just the role for now; widen to roles[] when dynamic
// multi-role assignment lands (only audiencesOf() needs to change).
export interface PolicyViewer {
  role?: string | null
}

// The audiences a key is visible to. Empty/missing ⇒ admin-only (admin still
// sees it via canView's superuser short-circuit). Returns a COPY: the value is
// a shared reference into the loaded schema singleton, so a caller mutating it
// (push/splice) would otherwise silently alter the effective visibility
// process-wide and could weaken canView().
export function audiencesFor(key: PolicyKey): Audience[] {
  return [...(rawSchema.properties[key]['x-visibility'] ?? [])]
}

// The audiences a viewer belongs to. 'public' is universal (every viewer,
// including anonymous); logged-in viewers additionally carry 'authenticated'
// and their role name(s).
export function audiencesOf(user: PolicyViewer | null | undefined): Set<Audience> {
  const audiences = new Set<Audience>([PUBLIC_AUDIENCE])
  if (user) {
    audiences.add(AUTHENTICATED_AUDIENCE)
    if (user.role) audiences.add(user.role)
  }
  return audiences
}

// Whether a viewer is an admin (superuser) — canView's short-circuit.
function isAdminViewer(user: PolicyViewer | null | undefined): boolean {
  return audiencesOf(user).has(ADMIN_AUDIENCE)
}

// The single visibility primitive. Admin sees everything; everyone else sees a
// key iff they share at least one audience with it.
export function canView(key: PolicyKey, user: PolicyViewer | null | undefined): boolean {
  if (isAdminViewer(user)) return true
  const viewer = audiencesOf(user)
  return audiencesFor(key).some((audience) => viewer.has(audience))
}

// All keys a viewer may see.
export function visibleKeys(user: PolicyViewer | null | undefined): PolicyKey[] {
  return allKeys().filter((key) => canView(key, user))
}

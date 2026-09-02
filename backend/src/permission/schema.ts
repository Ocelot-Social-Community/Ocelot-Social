// Accessors over the canonical permission catalog (./permission.catalog.json).
// The JSON is the single source of truth for the set of global permission keys;
// roles (DB data) reference these keys, and the shield references them at the
// enforcement points. Everything else derives from here.

// Loading the canonical JSON at module init is intentional and matches the policy module (the
// build copies the .json next to this file). Under ESM this is a plain import carrying the
// `type: 'json'` attribute Node requires, which replaced the former require().
/* eslint-disable security/detect-object-injection */ // keys come from the fixed catalog, never user input
import rawCatalogJson from './permission.catalog.json' with { type: 'json' }

import type {
  PermissionCatalogEntry,
  PermissionGate,
  PermissionGroup,
  PermissionKey,
} from './types'

interface RawCatalog {
  permissions: Record<string, PermissionCatalogEntry>
}

const rawCatalog = rawCatalogJson as RawCatalog

// Frozen so a consumer can never mutate the shared catalog singleton.
const catalog: Record<string, PermissionCatalogEntry> = Object.freeze({
  ...rawCatalog.permissions,
})

const keySet = new Set(Object.keys(catalog))

// All known permission keys, in catalog (declaration) order.
export function allPermissionKeys(): PermissionKey[] {
  return Object.keys(catalog) as PermissionKey[]
}

// Whether a string is a known catalog key. Type guard so callers narrow to
// PermissionKey. Used to drop catalog-drift keys from stored role definitions.
export function isKnownPermission(key: string): key is PermissionKey {
  return keySet.has(key)
}

export function groupFor(key: PermissionKey): PermissionGroup {
  return catalog[key].group
}

export function descriptionFor(key: PermissionKey): string {
  return catalog[key].description
}

// The runtime feature gates a permission depends on, normalised to a list (empty when
// the permission is always effective). A single `gatedBy` string is shorthand for a
// one-element list; an array means the permission is effective only while EVERY listed
// gate is open (AND). See ./gates.ts for how a gate name resolves to a boolean.
export function gatesFor(key: PermissionKey): PermissionGate[] {
  const gatedBy = catalog[key].gatedBy
  if (gatedBy === undefined) {
    return []
  }
  return Array.isArray(gatedBy) ? [...gatedBy] : [gatedBy]
}

// The distinct runtime gates the catalog declares, in first-seen (declaration) order.
// This is the set of policy keys whose value flips permission availability network-wide —
// derived from the catalog (the single source) so a newly gated permission automatically
// registers its gate(s), with no separate hand-maintained list to keep in sync.
export function allPermissionGates(): PermissionGate[] {
  const gates = new Set<PermissionGate>()
  for (const key of allPermissionKeys()) {
    for (const gate of gatesFor(key)) {
      gates.add(gate)
    }
  }
  return [...gates]
}

// The full catalog as a flat list — the shape the admin UI / GraphQL resolver
// projects (key + group + gatedBy + description). `gatedBy` is normalised to a list.
// Returns fresh objects so callers can't mutate the singleton.
export function permissionCatalog(): Array<{
  key: PermissionKey
  group: PermissionGroup
  gatedBy: PermissionGate[]
  description: string
}> {
  return allPermissionKeys().map((key) => ({
    key,
    group: groupFor(key),
    gatedBy: gatesFor(key),
    description: descriptionFor(key),
  }))
}

// Normalise a stored/incoming list of permission keys: drop unknown keys
// (catalog drift — a key removed in a refactor grants nothing rather than
// throwing), de-duplicate, and preserve a stable catalog order. The single
// place role permission arrays are sanitised on the way in and out of the DB.
export function sanitizePermissions(keys: readonly string[]): PermissionKey[] {
  const wanted = new Set(keys)
  return allPermissionKeys().filter((key) => wanted.has(key))
}

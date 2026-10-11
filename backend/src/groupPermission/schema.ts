// Accessors over the canonical GROUP permission catalog (./groupPermission.catalog.json).
// The JSON is the single source of truth for the set of group-scoped permission keys;
// a group's role definitions (DB data) reference these keys, and the shield references
// them at the enforcement points. Everything else derives from here.
//
// Deliberately a twin of ../permission/schema.ts rather than a shared abstraction: the
// two catalogs have different scopes (global vs. per-group) and different extras
// (requiresNetworkPermission exists only here), and the duplication is 60 lines of
// straightforward accessors against divergent types.
/* eslint-disable security/detect-object-injection */ // keys come from the fixed catalog, never user input
import rawCatalogJson from './groupPermission.catalog.json' with { type: 'json' }

import type {
  GroupPermissionCatalogEntry,
  GroupPermissionGate,
  GroupPermissionGroup,
  GroupPermissionKey,
  NetworkPrerequisiteTemplate,
} from './types'

interface RawCatalog {
  permissions: Record<string, GroupPermissionCatalogEntry>
}

const rawCatalog = rawCatalogJson as RawCatalog

// Frozen so a consumer can never mutate the shared catalog singleton.
const catalog: Record<string, GroupPermissionCatalogEntry> = Object.freeze({
  ...rawCatalog.permissions,
})

const keySet = new Set(Object.keys(catalog))

// All known group permission keys, in catalog (declaration) order.
export function allGroupPermissionKeys(): GroupPermissionKey[] {
  return Object.keys(catalog) as GroupPermissionKey[]
}

// Whether a string is a known catalog key. Type guard so callers narrow to
// GroupPermissionKey. Used to drop catalog-drift keys from stored role definitions.
export function isKnownGroupPermission(key: string): key is GroupPermissionKey {
  return keySet.has(key)
}

export function groupFor(key: GroupPermissionKey): GroupPermissionGroup {
  return catalog[key].group
}

export function descriptionFor(key: GroupPermissionKey): string {
  return catalog[key].description
}

// The extra runtime gates a group permission depends on, normalised to a list (empty
// when it depends on nothing beyond groupsEnabled). An array means the permission is
// effective only while EVERY listed gate is open (AND). See ./gates.ts.
export function gatesFor(key: GroupPermissionKey): GroupPermissionGate[] {
  const gatedBy = catalog[key].gatedBy
  if (gatedBy === undefined) {
    return []
  }
  return [gatedBy]
}

// The distinct extra gates the catalog declares, in first-seen (declaration) order.
// Derived from the catalog so a newly gated permission registers its gate
// automatically, with no hand-maintained list to keep in sync.
export function allGroupPermissionGates(): GroupPermissionGate[] {
  const gates = new Set<GroupPermissionGate>()
  for (const key of allGroupPermissionKeys()) {
    for (const gate of gatesFor(key)) {
      gates.add(gate)
    }
  }
  return [...gates]
}

// The raw network prerequisite as the catalog declares it — possibly still carrying the
// '<type>' placeholder. Resolve it with networkPrerequisiteFor() in ./prerequisites.ts;
// this accessor exists for the catalog projection and the drift guards.
export function networkPrerequisiteTemplateFor(
  key: GroupPermissionKey,
): NetworkPrerequisiteTemplate | null {
  return catalog[key].requiresNetworkPermission ?? null
}

// The full catalog as a flat list — the shape the group rights UI / GraphQL resolver
// projects. `gatedBy` is normalised to a list. Returns fresh objects so callers can't
// mutate the singleton.
export function groupPermissionCatalog(): Array<{
  key: GroupPermissionKey
  group: GroupPermissionGroup
  gatedBy: GroupPermissionGate[]
  requiresNetworkPermission: NetworkPrerequisiteTemplate | null
  description: string
}> {
  return allGroupPermissionKeys().map((key) => ({
    key,
    group: groupFor(key),
    gatedBy: gatesFor(key),
    requiresNetworkPermission: networkPrerequisiteTemplateFor(key),
    description: descriptionFor(key),
  }))
}

// Normalise a stored/incoming list of group permission keys: drop unknown keys
// (catalog drift — a key removed in a refactor grants nothing rather than throwing),
// de-duplicate, and preserve a stable catalog order. The single place a group role's
// permission array is sanitised on the way in and out of the DB.
export function sanitizeGroupPermissions(keys: readonly string[]): GroupPermissionKey[] {
  const wanted = new Set(keys)
  return allGroupPermissionKeys().filter((key) => wanted.has(key))
}

// Accessors over the canonical permission catalog (./permission.catalog.json).
// The JSON is the single source of truth for the set of global permission keys;
// roles (DB data) reference these keys, and the shield references them at the
// enforcement points. Everything else derives from here.

// Loading the canonical JSON synchronously at module init is intentional and
// matches the policy module (resolveJsonModule is off project-wide; the build
// copies the .json next to this file). require() is the established pattern for
// static config in this codebase.
/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-commonjs, n/global-require */
/* eslint-disable security/detect-object-injection */ // keys come from the fixed catalog, never user input
import type { PermissionCatalogEntry, PermissionGroup, PermissionKey } from './types'

interface RawCatalog {
  permissions: Record<string, PermissionCatalogEntry>
}

const rawCatalog = require('./permission.catalog.json') as RawCatalog

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

// The full catalog as a flat list — the shape the admin UI / GraphQL resolver
// projects (key + group + description). Returns fresh objects so callers can't
// mutate the singleton.
export function permissionCatalog(): Array<{
  key: PermissionKey
  group: PermissionGroup
  description: string
}> {
  return allPermissionKeys().map((key) => ({
    key,
    group: groupFor(key),
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

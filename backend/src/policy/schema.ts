// Schema accessors. The canonical schema lives at ./policy.schema.json — keep
// ./types.ts in sync with it (defaults are read from the JSON at runtime, so
// type-level drift is the only concern).

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import type { NetworkPolicy, PolicyKey, Visibility } from './types'

interface RawProperty {
  type: string
  default: unknown
  description?: string
  'x-visibility'?: Visibility
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

export function visibilityFor(key: PolicyKey): Visibility {
  return rawSchema.properties[key]['x-visibility'] ?? 'admin'
}

export function keysByVisibility(visibility: Visibility): PolicyKey[] {
  return allKeys().filter((key) => {
    if (visibility === 'admin') return true
    return visibilityFor(key) === 'public'
  })
}

export function typeFor(key: PolicyKey): string {
  return rawSchema.properties[key].type
}

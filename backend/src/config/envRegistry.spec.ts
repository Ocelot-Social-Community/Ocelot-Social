// Drift guard between the runtime config and the admin env registry.
//
// config/index.ts reads the environment imperatively; envRegistry.ts describes the same
// vars declaratively for the admin "environment configuration" tab. The registry comment
// asks to "keep in sync with config/index.ts" — this test enforces it instead of trusting
// a human. A new env var read in config that is forgotten in the registry would otherwise
// be silently mistreated by the admin view (defaulted to secret / 'general'); a registry
// entry no runtime code reads is dead metadata.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import { ENV_REGISTRY, ENV_SPEC_BY_NAME } from './envRegistry'

// Env vars config/index.ts reads that are intentionally NOT admin config rows (derived or
// sourced outside the env). Keep tiny and justified — an entry here is a var the admin tab
// will not show. Empty today: every env var the runtime reads is a declared registry row.
const NON_REGISTRY_ENV_READS = new Set<string>([])

// Registry entries not read by config/index.ts (e.g. surfaced for diagnostics only). Empty
// today: every declared var is read by the runtime.
const REGISTRY_ONLY_VARS = new Set<string>([])

// Every `env.X` / `process.env.X` (the latter contains `env.X`) identifier config reads —
// the authoritative set of env vars the runtime depends on. Read from source rather than
// executed, so no config side effects and no env dance.
const configEnvReads = (): Set<string> => {
  // eslint-disable-next-line n/no-sync -- test-time read of a sibling source file
  const source = readFileSync(join(import.meta.dirname, 'index.ts'), 'utf8')
  const names = new Set<string>()
  for (const match of source.matchAll(/\benv\.([A-Z][A-Z0-9_]+)/g)) {
    names.add(match[1])
  }
  return names
}

describe('envRegistry ↔ config/index.ts env vars', () => {
  it('declares every env var the runtime config reads', () => {
    const reads = configEnvReads()

    // Sanity: the extraction found the reads at all (guards against a refactor that moves
    // env access behind a helper and silently empties this check).
    expect(reads.size).toBeGreaterThan(20)

    const missing = [...reads].filter(
      (name) => !(name in ENV_SPEC_BY_NAME) && !NON_REGISTRY_ENV_READS.has(name),
    )

    expect(missing).toEqual([])
  })

  it('reads every env var the registry declares (no dead metadata)', () => {
    const reads = configEnvReads()
    const unread = ENV_REGISTRY.map((spec) => spec.name).filter(
      (name) => !reads.has(name) && !REGISTRY_ONLY_VARS.has(name),
    )

    expect(unread).toEqual([])
  })
})

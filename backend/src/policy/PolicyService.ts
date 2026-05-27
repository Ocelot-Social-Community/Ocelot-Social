// PolicyService — in-memory + Neo4j-backed network policy resolution.
//
// Phase B5 scope (read-only):
//   • init() seeds DB from ENV / schema-default if value is missing
//   • get() / getSnapshot() read from in-memory cache
//   • No setPolicy mutation yet (comes with B6) → no Ajv validation needed here
//
// Resolution-Order at init() time:
//   1. DB-Value (kept if present)
//   2. ENV-Seed via x-envSeed → write to DB once
//   3. Schema-Default → write to DB once
//
// After init(), get() always returns from cache. Cache is per process; multiple
// backend instances will diverge until B7 (Pub/Sub Invalidation) is implemented.

import databaseContext from '@context/database'

import { allKeys, defaultFor, envSeedFor, keysByVisibility, typeFor } from './schema'
import {
  POLICY_NAMESPACE,
  ensureConstraint,
  readAllSettings,
  writeSetting,
} from './repository'

import type { NetworkPolicy, PolicyKey, Visibility } from './types'

type DbContext = ReturnType<typeof databaseContext>

function parseEnvValue(envName: string, env: NodeJS.ProcessEnv, typeName: string): unknown {
  const raw = env[envName]
  if (raw === undefined) return undefined

  if (typeName === 'boolean') {
    if (raw === 'true') return true
    if (raw === 'false') return false
    return undefined // fall through to default
  }
  if (typeName === 'integer') {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : undefined
  }
  if (typeName === 'string') return raw
  return undefined
}

export class PolicyService {
  private cache: Partial<NetworkPolicy> = {}
  private initialised = false

  constructor(private readonly db: DbContext = databaseContext()) {}

  async init(env: NodeJS.ProcessEnv = process.env): Promise<void> {
    await ensureConstraint(this.db)
    const dbValues = await readAllSettings(this.db, POLICY_NAMESPACE)

    for (const key of allKeys()) {
      const existing = dbValues[key]
      if (existing !== undefined) {
        this.cache[key] = existing as NetworkPolicy[PolicyKey]
        continue
      }

      const envName = envSeedFor(key)
      const envValue = envName ? parseEnvValue(envName, env, typeFor(key)) : undefined
      const seedValue = envValue !== undefined ? envValue : defaultFor(key)

      await writeSetting(this.db, POLICY_NAMESPACE, key, seedValue, 'system:seed')
      this.cache[key] = seedValue as NetworkPolicy[PolicyKey]
    }

    this.initialised = true
  }

  get<K extends PolicyKey>(key: K): NetworkPolicy[K] {
    if (!this.initialised) {
      // Guard against access before init() — should only happen in tests
      return defaultFor(key)
    }
    const value = this.cache[key]
    return (value !== undefined ? value : defaultFor(key)) as NetworkPolicy[K]
  }

  getSnapshot(visibility: Visibility = 'public'): Partial<NetworkPolicy> {
    const out: Record<string, unknown> = {}
    for (const key of keysByVisibility(visibility)) {
      out[key] = this.get(key)
    }
    return out as Partial<NetworkPolicy>
  }
}

// Module-level singleton; constructed lazily so tests can swap it.
let instance: PolicyService | undefined

export function getPolicyService(): PolicyService {
  if (!instance) {
    instance = new PolicyService()
  }
  return instance
}

export function setPolicyServiceForTesting(svc: PolicyService | undefined): void {
  instance = svc
}

// Test-only: build a PolicyService whose cache is pre-populated and init() is a no-op.
// Avoids any DB access. Missing keys fall back to schema defaults.
interface PolicyServiceInternal {
  cache: Partial<NetworkPolicy>
  initialised: boolean
}

export function createInMemoryPolicyService(values: Partial<NetworkPolicy> = {}): PolicyService {
  const svc = Object.create(PolicyService.prototype) as unknown as PolicyServiceInternal
  svc.cache = { ...values }
  svc.initialised = true
  return svc as unknown as PolicyService
}

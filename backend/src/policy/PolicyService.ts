// PolicyService — in-memory + Neo4j-backed network policy resolution.
//
// Lifecycle:
//   • init() seeds DB from ENV / schema-default if a value is missing, populates
//     the in-memory cache, and (if a pubsub is provided) subscribes to
//     POLICY_CHANGED_CHANNEL so other backend instances stay in sync.
//   • get() / getSnapshot() read from the cache.
//   • set() / reset() persist, update the local cache, and publish a change
//     event. All listening instances (including the publisher itself) apply the
//     change via applyExternalChange().
//
// Resolution order at init() time:
//   1. DB value (kept if present)
//   2. ENV seed via x-envSeed → written to DB once
//   3. Schema default → written to DB once
//
// Single-instance: no special concern. Multi-instance: eventual consistency via
// Redis pubsub; same-key concurrent writes resolve to last-writer-wins (Cypher
// MERGE is atomic per query, but ordering across instances is not enforced).

import databaseContext from '@context/database'

import { allKeys, defaultFor, envSeedFor, typeFor, visibleKeys } from './schema'
import {
  POLICY_NAMESPACE,
  deleteSetting,
  ensureConstraint,
  readAllSettings,
  writeSetting,
} from './repository'

import type { PolicyViewer } from './schema'
import type { NetworkPolicy, PolicyKey } from './types'

type DbContext = ReturnType<typeof databaseContext>

export const POLICY_CHANGED_CHANNEL = 'policy.changed'

export interface PolicyChangeEvent {
  key: string
  value: unknown
  actor: string
  timestamp: string
}

// Minimal pubsub shape — compatible with both `graphql-subscriptions` PubSub
// and `graphql-redis-subscriptions` RedisPubSub.
export interface PolicyPubSub {
  publish(triggerName: string, payload: unknown): void | Promise<void>
  subscribe(
    triggerName: string,
    onMessage: (payload: { policyChanged: PolicyChangeEvent }) => void,
  ): Promise<number>
  unsubscribe(subId: number): void
}

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
  private pubsub: PolicyPubSub | undefined
  private env: NodeJS.ProcessEnv = process.env
  private subscriptionId: number | undefined

  constructor(private readonly db: DbContext = databaseContext()) {}

  async init(
    env: NodeJS.ProcessEnv = process.env,
    pubsub?: PolicyPubSub,
  ): Promise<void> {
    this.env = env
    this.pubsub = pubsub

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

    if (pubsub) {
      this.subscriptionId = await pubsub.subscribe(POLICY_CHANGED_CHANNEL, (payload) => {
        this.applyExternalChange(payload.policyChanged)
      })
    }

    this.initialised = true
  }

  async shutdown(): Promise<void> {
    if (this.subscriptionId !== undefined && this.pubsub) {
      this.pubsub.unsubscribe(this.subscriptionId)
      this.subscriptionId = undefined
    }
  }

  get<K extends PolicyKey>(key: K): NetworkPolicy[K] {
    if (!this.initialised) {
      // Guard against access before init() — should only happen in tests
      return defaultFor(key)
    }
    const value = this.cache[key]
    return (value !== undefined ? value : defaultFor(key)) as NetworkPolicy[K]
  }

  // The snapshot as visible to a given viewer. Keys the viewer may not see are
  // omitted (the GraphQL layer renders them as null). Visibility is decided by
  // canView() via visibleKeys() — the single source of truth shared with the
  // subscription filter.
  getVisibleSnapshot(user: PolicyViewer | null | undefined): Partial<NetworkPolicy> {
    const out: Record<string, unknown> = {}
    for (const key of visibleKeys(user)) {
      out[key] = this.get(key)
    }
    return out as Partial<NetworkPolicy>
  }

  async set<K extends PolicyKey>(
    key: K,
    value: NetworkPolicy[K],
    actor: string,
  ): Promise<PolicyChangeEvent> {
    this.assertKnownKey(key)
    this.assertTypeMatches(key, value)

    await writeSetting(this.db, POLICY_NAMESPACE, key, value, actor)
    this.cache[key] = value

    const event: PolicyChangeEvent = {
      key: String(key),
      value,
      actor,
      timestamp: new Date().toISOString(),
    }
    // eslint-disable-next-line no-console
    console.log(
      `[policy] publish ${POLICY_CHANGED_CHANNEL}`,
      JSON.stringify(event),
      'pubsub?',
      !!this.pubsub,
    )
    void this.pubsub?.publish(POLICY_CHANGED_CHANNEL, { policyChanged: event })
    return event
  }

  async reset<K extends PolicyKey>(key: K, actor: string): Promise<PolicyChangeEvent> {
    this.assertKnownKey(key)

    await deleteSetting(this.db, POLICY_NAMESPACE, key)

    const envName = envSeedFor(key)
    const envValue = envName ? parseEnvValue(envName, this.env, typeFor(key)) : undefined
    const newValue = (envValue !== undefined ? envValue : defaultFor(key)) as NetworkPolicy[K]
    this.cache[key] = newValue

    const event: PolicyChangeEvent = {
      key: String(key),
      value: newValue,
      actor,
      timestamp: new Date().toISOString(),
    }
    void this.pubsub?.publish(POLICY_CHANGED_CHANNEL, { policyChanged: event })
    return event
  }

  // Called by the pubsub subscription when any backend instance publishes a
  // change. Idempotent when invoked locally after our own set() updated the
  // cache (same value written twice).
  applyExternalChange(event: PolicyChangeEvent): void {
    if (!this.isKnownKey(event.key)) return
    this.cache[event.key as PolicyKey] = event.value as never
  }

  private isKnownKey(key: string): key is PolicyKey {
    return (allKeys() as string[]).includes(key)
  }

  private assertKnownKey(key: string): void {
    if (!this.isKnownKey(key)) {
      throw new Error(`Unknown policy key: ${key}`)
    }
  }

  private assertTypeMatches(key: PolicyKey, value: unknown): void {
    const expected = typeFor(key)
    const actual = typeof value
    const ok =
      (expected === 'boolean' && actual === 'boolean') ||
      (expected === 'integer' && actual === 'number' && Number.isInteger(value)) ||
      (expected === 'string' && actual === 'string')
    if (!ok) {
      throw new Error(
        `Type mismatch for policy key '${key}': expected ${expected}, got ${actual}`,
      )
    }
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

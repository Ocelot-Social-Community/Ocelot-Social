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

/* eslint-disable security/detect-object-injection */ // keys are PolicyKeys from the schema, never user input
import databaseContext from '@context/database'

import {
  POLICY_NAMESPACE,
  deleteSetting,
  ensureConstraint,
  readAllSettings,
  readLastChange,
  writeSetting,
} from './repository'
import { allKeys, canView, defaultFor, envSeedFor, typeFor } from './schema'

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
  publish: (triggerName: string, payload: unknown) => void | Promise<void>
  subscribe: (
    triggerName: string,
    onMessage: (payload: { policyChanged: PolicyChangeEvent }) => void,
  ) => Promise<number>
  unsubscribe: (subId: number) => void
}

// The deployment environment map (a subset of process.env), passed in from the
// app entry — PolicyService never reads process.env itself.
type Env = Record<string, string | undefined>

function parseEnvValue(envName: string, env: Env, typeName: string): unknown {
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
  private env: Env = {}
  private subscriptionId: number | undefined
  private lastChange: { actor: string; timestamp: string } | undefined

  constructor(private readonly db: DbContext = databaseContext()) {}

  async init(env: Env, pubsub?: PolicyPubSub): Promise<void> {
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

    // Most recent change (who + when) for the admin UI; cached in memory and
    // kept current by set()/reset()/applyExternalChange() afterwards.
    this.lastChange = (await readLastChange(this.db, POLICY_NAMESPACE)) ?? undefined

    if (pubsub) {
      this.subscriptionId = await pubsub.subscribe(POLICY_CHANGED_CHANNEL, (payload) => {
        this.applyExternalChange(payload.policyChanged)
      })
    }

    this.initialised = true
  }

  shutdown(): void {
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
    return value ?? defaultFor(key)
  }

  // The snapshot as visible to a given viewer. Every key is present so the
  // GraphQL default field resolver never returns `undefined` (which the schema
  // middleware rejects); keys the viewer may not see are explicitly `null`.
  // Visibility is decided by canView() — the single source of truth shared with
  // the subscription filter.
  getVisibleSnapshot(user: PolicyViewer | null | undefined): Record<PolicyKey, boolean | null> {
    const out = {} as Record<PolicyKey, boolean | null>
    for (const key of allKeys()) {
      out[key] = canView(key, user) ? this.get(key) : null
    }
    return out
  }

  // The default a key resets to: the ENV seed (x-envSeed) configured for this
  // deployment if set, otherwise the schema default. Single source of truth for
  // "the configured default" — the frontend has none of its own.
  getDefault<K extends PolicyKey>(key: K): NetworkPolicy[K] {
    const envName = envSeedFor(key)
    const envValue = envName ? parseEnvValue(envName, this.env, typeFor(key)) : undefined
    return (envValue !== undefined ? envValue : defaultFor(key)) as NetworkPolicy[K]
  }

  // Defaults as visible to a viewer — same canView scoping as getVisibleSnapshot
  // (admins see every key; non-visible keys are null).
  getVisibleDefaults(user: PolicyViewer | null | undefined): Record<PolicyKey, boolean | null> {
    const out = {} as Record<PolicyKey, boolean | null>
    for (const key of allKeys()) {
      out[key] = canView(key, user) ? this.getDefault(key) : null
    }
    return out
  }

  // Who last changed any policy key, and when (null if never changed). Cached in
  // memory: read at init, then updated on every set/reset/remote change.
  getLastChange(): { actor: string; timestamp: string } | null {
    return this.lastChange ?? null
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
      key,
      value,
      actor,
      timestamp: new Date().toISOString(),
    }
    this.lastChange = { actor: event.actor, timestamp: event.timestamp }
    void this.pubsub?.publish(POLICY_CHANGED_CHANNEL, { policyChanged: event })
    return event
  }

  async reset(key: PolicyKey, actor: string): Promise<PolicyChangeEvent> {
    this.assertKnownKey(key)

    await deleteSetting(this.db, POLICY_NAMESPACE, key)

    const newValue = this.getDefault(key)
    this.cache[key] = newValue

    const event: PolicyChangeEvent = {
      key,
      value: newValue,
      actor,
      timestamp: new Date().toISOString(),
    }
    this.lastChange = { actor: event.actor, timestamp: event.timestamp }
    void this.pubsub?.publish(POLICY_CHANGED_CHANNEL, { policyChanged: event })
    return event
  }

  // Called by the pubsub subscription when any backend instance publishes a
  // change. Idempotent when invoked locally after our own set() updated the
  // cache (same value written twice).
  applyExternalChange(event: PolicyChangeEvent): void {
    if (!this.isKnownKey(event.key)) return
    this.cache[event.key] = event.value as never
    this.lastChange = { actor: event.actor, timestamp: event.timestamp }
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
      throw new Error(`Type mismatch for policy key '${key}': expected ${expected}, got ${actual}`)
    }
  }
}

// Module-level singleton; constructed lazily so tests can swap it.
let instance: PolicyService | undefined

export function getPolicyService(): PolicyService {
  instance ??= new PolicyService()
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
  env: Env
}

export function createInMemoryPolicyService(
  values: Partial<NetworkPolicy> = {},
  env: Env = {},
): PolicyService {
  const svc = Object.create(PolicyService.prototype) as unknown as PolicyServiceInternal
  svc.cache = { ...values }
  svc.initialised = true
  svc.env = env // so getDefault() can read x-envSeed values
  return svc as unknown as PolicyService
}

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
//   2. ENV seed via envSeed → written to DB once
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
  readAllSettings,
  readLastChange,
  writeSetting,
} from './repository'
import { allKeys, canView, defaultFor, envSeedFor, typeFor, validatePolicyValue } from './schema'

import type { PolicyViewer } from './schema'
import type { NetworkPolicy, PolicyKey, PolicyValue } from './types'

type DbContext = ReturnType<typeof databaseContext>

export const POLICY_CHANGED_CHANNEL = 'policy.changed'

// Domain-level validation error (unknown key / wrong value type). Kept free of
// any GraphQL dependency — the resolver translates it to a UserInputError at the
// transport boundary, so a bad client input is classified as BAD_USER_INPUT
// rather than a generic/internal error.
export class PolicyValidationError extends Error {}

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

    // Subscribe BEFORE reading the snapshot. Otherwise a change published by
    // another instance in the gap between read and subscribe would be missed
    // (the read already happened, the subscription wasn't live yet), leaving
    // this instance stale until the next change. Events apply via
    // applyExternalChange (full values, last-writer-wins); the snapshot loop
    // below won't clobber a key such an event already set.
    if (pubsub) {
      this.subscriptionId = await pubsub.subscribe(POLICY_CHANGED_CHANNEL, (payload) => {
        this.applyExternalChange(payload.policyChanged)
      })
    }

    await this.loadFromDb()

    this.initialised = true
  }

  // Re-read the policy snapshot from the DB into the cache, WITHOUT touching the
  // pubsub subscription. Shared by init() and reload(); the latter is the cache-resync
  // trigger used after a DB reset/seed (a separate process wipes the DB but cannot
  // clear this in-memory cache, so we re-read on demand).
  private async loadFromDb(): Promise<void> {
    const dbValues = await readAllSettings(this.db, POLICY_NAMESPACE)

    for (const key of allKeys()) {
      // A concurrent change event during init already set this key to a value
      // at least as fresh as the snapshot — don't overwrite it with the read.
      if (this.cache[key] !== undefined) continue

      const existing = dbValues[key]
      // Adopt a stored value only if it still satisfies the schema.
      if (existing !== undefined && this.isValidValue(key, existing)) {
        this.cache[key] = existing as never
        continue
      }
      // Missing, or present but invalid (out-of-band edit / un-migrated schema
      // change) — reseed from ENV/default. Never throw: a corrupt row must not
      // crash startup.
      if (existing !== undefined) {
        // eslint-disable-next-line no-console
        console.warn(
          `[policy] DB value for '${key}' is invalid (${typeof existing}); reseeding from ENV/default.`,
        )
      }

      const envName = envSeedFor(key)
      const envValue = envName ? parseEnvValue(envName, this.env, typeFor(key)) : undefined
      const seedValue = envValue !== undefined ? envValue : defaultFor(key)

      await writeSetting(this.db, POLICY_NAMESPACE, key, seedValue, 'system:seed')
      // Re-check after the await: a concurrent change event may have set the cache
      // for this key in the meantime (fresher than our seed) — keep that in-memory.
      // (The DB row itself could be clobbered by the seed in that boot-window race,
      // but the cache stays correct and the next change re-syncs the DB; a policy
      // change coinciding with this instance's boot is vanishingly rare.)
      this.cache[key] ??= seedValue as never
    }

    // Most recent change (who + when) for the admin UI. Read from the DB after
    // the snapshot; a change-event during init may have set it too — readLastChange
    // reflects the committed DB truth, so it is the authoritative final value.
    this.lastChange = (await readLastChange(this.db, POLICY_NAMESPACE)) ?? undefined
  }

  // Resync the cache from the DB after an out-of-process change (e.g. db:reset/seed).
  // Clears first so values for keys removed from the DB fall back to ENV/default
  // rather than lingering. Does not re-subscribe.
  async reload(): Promise<void> {
    this.cache = {}
    await this.loadFromDb()
  }

  shutdown(): void {
    if (this.subscriptionId !== undefined && this.pubsub) {
      this.pubsub.unsubscribe(this.subscriptionId)
      this.subscriptionId = undefined
    }
  }

  // Server-side accessor: ALWAYS returns a concrete value — the cached value, or
  // the schema default if a key was never set (`?? defaultFor`). It NEVER returns
  // null/undefined (the return type is the non-nullable NetworkPolicy[K]). Viewer
  // visibility scoping — where a key can come back as `null` — lives only in
  // getVisibleSnapshot()/the GraphQL `policy` query, NOT in this accessor. So
  // resolvers can compare the result directly (=== / >=) without null-guarding.
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
  getVisibleSnapshot(user: PolicyViewer | null | undefined): Record<PolicyKey, PolicyValue | null> {
    const out = {} as Record<PolicyKey, PolicyValue | null>
    for (const key of allKeys()) {
      out[key] = canView(key, user) ? this.get(key) : null
    }
    return out
  }

  // The default a key resets to: the ENV seed (envSeed) configured for this
  // deployment if set, otherwise the schema default. Single source of truth for
  // "the configured default" — the frontend has none of its own.
  getDefault<K extends PolicyKey>(key: K): NetworkPolicy[K] {
    const envName = envSeedFor(key)
    const envValue = envName ? parseEnvValue(envName, this.env, typeFor(key)) : undefined
    return (envValue !== undefined ? envValue : defaultFor(key)) as NetworkPolicy[K]
  }

  // Defaults as visible to a viewer — same canView scoping as getVisibleSnapshot
  // (admins see every key; non-visible keys are null).
  getVisibleDefaults(user: PolicyViewer | null | undefined): Record<PolicyKey, PolicyValue | null> {
    const out = {} as Record<PolicyKey, PolicyValue | null>
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
    this.assertValidValue(key, value)

    await writeSetting(this.db, POLICY_NAMESPACE, key, value, actor)
    this.cache[key] = value

    const event: PolicyChangeEvent = {
      key,
      value,
      actor,
      timestamp: new Date().toISOString(),
    }
    this.lastChange = { actor: event.actor, timestamp: event.timestamp }
    this.publishChange(event)
    return event
  }

  async reset(key: PolicyKey, actor: string): Promise<PolicyChangeEvent> {
    this.assertKnownKey(key)

    await deleteSetting(this.db, POLICY_NAMESPACE, key)

    const newValue = this.getDefault(key)
    this.cache[key] = newValue as never

    const event: PolicyChangeEvent = {
      key,
      value: newValue,
      actor,
      timestamp: new Date().toISOString(),
    }
    this.lastChange = { actor: event.actor, timestamp: event.timestamp }
    this.publishChange(event)
    return event
  }

  // Broadcast a change to other instances. Intentionally non-blocking: the DB
  // write is the commit point and the local cache is already updated, so a
  // broadcast failure must NOT fail the caller's set()/reset(). We log both
  // failure modes — a SYNCHRONOUS throw from publish() (try/catch) and a rejected
  // async publish, e.g. Redis down (.catch) — but never propagate either, and
  // never leave an unhandled rejection. publish() may return void (sync) or a
  // promise; we call it synchronously and normalise the result with Promise.resolve.
  private publishChange(event: PolicyChangeEvent): void {
    try {
      const result = this.pubsub?.publish(POLICY_CHANGED_CHANNEL, { policyChanged: event })
      // eslint-disable-next-line promise/prefer-await-to-callbacks, @typescript-eslint/use-unknown-in-catch-callback-variable
      void Promise.resolve(result).catch((err) => {
        this.warnPublishFailed(err)
      })
      // publish() threw synchronously — deliberately swallowed (a broadcast
      // failure never fails set()/reset()), hence no rethrow.
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (err) {
      this.warnPublishFailed(err)
    }
  }

  private warnPublishFailed(err: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(`[policy] failed to publish ${POLICY_CHANGED_CHANNEL}:`, err)
  }

  // Called by the pubsub subscription when any backend instance publishes a
  // change. Idempotent when invoked locally after our own set() updated the
  // cache (same value written twice).
  applyExternalChange(event: PolicyChangeEvent): void {
    if (!this.isKnownKey(event.key)) return
    // Discard a malformed cross-instance event (e.g. a different / older backend
    // version publishing a wrong-typed value) instead of corrupting the cache —
    // symmetric with init()'s reseed-on-mismatch. Never throws: this runs inside
    // the pubsub handler, and lastChange must not move for a rejected event.
    if (!this.isValidValue(event.key, event.value)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[policy] ignoring invalid external change for '${event.key}' (${typeof event.value}).`,
      )
      return
    }
    this.cache[event.key] = event.value as never
    this.lastChange = { actor: event.actor, timestamp: event.timestamp }
  }

  private isKnownKey(key: string): key is PolicyKey {
    return (allKeys() as string[]).includes(key)
  }

  private assertKnownKey(key: string): void {
    if (!this.isKnownKey(key)) {
      throw new PolicyValidationError(`Unknown policy key: ${key}`)
    }
  }

  // Non-throwing schema validity check (type AND constraints, e.g. minimum),
  // shared by init() (reseed on mismatch) and assertValidValue() (throw on
  // mismatch). Delegates to the Ajv-backed validator in schema.ts.
  private isValidValue(key: PolicyKey, value: unknown): boolean {
    return validatePolicyValue(key, value) === true
  }

  private assertValidValue(key: PolicyKey, value: unknown): void {
    const result = validatePolicyValue(key, value)
    if (result !== true) {
      throw new PolicyValidationError(`Invalid value for policy key '${key}': ${result}`)
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
  init: PolicyService['init']
}

export function createInMemoryPolicyService(
  values: Partial<NetworkPolicy> = {},
  env: Env = {},
): PolicyService {
  const svc = Object.create(PolicyService.prototype) as unknown as PolicyServiceInternal
  svc.cache = { ...values }
  svc.initialised = true
  svc.env = env // so getDefault() can read envSeed values
  // The double has no DB (built via Object.create, no constructor). Make init()
  // a genuine no-op so a test that calls it lands here instead of the real DB
  // path with an undefined this.db (matches the "init() is a no-op" contract).
  svc.init = async () => {
    await Promise.resolve()
  }
  return svc as unknown as PolicyService
}

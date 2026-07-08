import { categoryRank } from '@src/config/categories'
import { allKeys, createInMemoryPolicyService } from '@src/policy'

import resolvers from './policyConfig'

import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'

// Drive the resolver through a real in-memory PolicyService so the value-layer +
// env-fold logic (getEffective / isAvailable / requiresEnvStatus / envState) is
// exercised end to end. env vars are reported by presence only, never by value.
const rowsFor = (
  values: Partial<NetworkPolicy> = {},
  env: Record<string, string | undefined> = {},
) => {
  const policy = createInMemoryPolicyService(values, env)
  return resolvers.Query.policyConfig(null, null, { policy } as unknown as Context)
}

const rowFor = (
  key: string,
  values?: Partial<NetworkPolicy>,
  env?: Record<string, string | undefined>,
) => {
  const row = rowsFor(values, env).find((entry) => entry.key === key)
  if (!row) throw new Error(`no policyConfig row for ${key}`)
  return row
}

describe('policyConfig resolver', () => {
  it('returns exactly one row per policy key', () => {
    const keys = rowsFor().map((row) => row.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect([...keys].sort()).toEqual([...allKeys()].sort())
  })

  it('returns an empty list when the context has no policy service (guarded, like systemConfig)', () => {
    const rows = resolvers.Query.policyConfig(null, null, {} as unknown as Context)
    expect(rows).toEqual([])
  })

  it('exposes each key’s display category (from the schema), so the admin UI groups without a hand-list', () => {
    expect(rowFor('publicRegistration').category).toBe('registration')
    expect(rowFor('showGroupButtonInHeader').category).toBe('layout')
    expect(rowFor('apiKeysEnabled').category).toBe('features')
    expect(rowFor('videoConference').category).toBe('video')
  })

  it('returns rows in the global category display order, so the policy tab renders straight from row order', () => {
    // Same single, backend-owned order (ENV_CATEGORIES) as the config tab; the policy tab
    // keeps no order list of its own, so the sort has to hold here at the source.
    const ranks = rowsFor().map((row) => categoryRank(row.category))
    const sorted = [...ranks].sort((a, b) => a - b)
    expect(ranks).toEqual(sorted)
  })

  describe('videoConference (env-gated)', () => {
    const LIVEKIT = {
      LIVEKIT_URL: 'wss://lk.example.org',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret',
    }

    it('is available and effective when the LiveKit env is present', () => {
      const row = rowFor('videoConference', {}, LIVEKIT)
      expect(row.available).toBe(true)
      expect(JSON.parse(row.effective)).toBe(true)
      expect(JSON.parse(row.softwareDefault)).toBe(true)
      expect(row.requiresEnv.map((entry) => entry.name)).toEqual([
        'LIVEKIT_URL',
        'LIVEKIT_API_KEY',
        'LIVEKIT_API_SECRET',
      ])
      expect(row.requiresEnv.every((entry) => entry.state === 'set')).toBe(true)
    })

    it('is unavailable and forced off when the env is missing', () => {
      const row = rowFor('videoConference', {}, {})
      expect(row.available).toBe(false)
      expect(JSON.parse(row.effective)).toBe(false)
      expect(row.requiresEnv.every((entry) => entry.state === 'missing')).toBe(true)
    })

    it('distinguishes an empty value from a missing one', () => {
      const row = rowFor('videoConference', {}, { ...LIVEKIT, LIVEKIT_API_SECRET: '' })
      const byName = Object.fromEntries(row.requiresEnv.map((entry) => [entry.name, entry.state]))
      expect(byName.LIVEKIT_URL).toBe('set')
      expect(byName.LIVEKIT_API_SECRET).toBe('empty')
      expect(row.available).toBe(false)
    })
  })

  describe('apiKeysEnabled (env-seeded, no hard requirement)', () => {
    it('reports the seed var and its presence, and folds it into the configured default', () => {
      const row = rowFor('apiKeysEnabled', {}, { API_KEYS_ENABLED: 'true' })
      expect(row.envSeed).toBe('API_KEYS_ENABLED')
      expect(row.envSeedState).toBe('set')
      expect(JSON.parse(row.configuredDefault)).toBe(true)
      expect(JSON.parse(row.softwareDefault)).toBe(false)
      expect(row.requiresEnv).toEqual([])
      // No hard requirement → always available regardless of env.
      expect(row.available).toBe(true)
    })

    it('marks the seed var missing when unset', () => {
      const row = rowFor('apiKeysEnabled', {}, {})
      expect(row.envSeedState).toBe('missing')
    })
  })

  it('exposes no envSeed for keys without one (videoConference uses requiresEnv instead)', () => {
    const row = rowFor('videoConference')
    expect(row.envSeed).toBeNull()
    expect(row.envSeedState).toBeNull()
  })

  describe('showGroupButtonInHeader (policy-gated by groupsEnabled)', () => {
    it('reports its policy dependency and stays available while groups are on', () => {
      const row = rowFor('showGroupButtonInHeader', { groupsEnabled: true })
      expect(row.requiresPolicy).toEqual([{ key: 'groupsEnabled', satisfied: true }])
      expect(row.available).toBe(true)
      // Env-only keys carry an empty policy-dependency list.
      expect(rowFor('badgesEnabled').requiresPolicy).toEqual([])
    })

    it('is unavailable (its stored toggle inert) while the groups feature is off', () => {
      const row = rowFor('showGroupButtonInHeader', {
        groupsEnabled: false,
        showGroupButtonInHeader: true,
      })
      expect(row.requiresPolicy).toEqual([{ key: 'groupsEnabled', satisfied: false }])
      // available folds the policy dependency (not just env) — this is what greys the toggle.
      expect(row.available).toBe(false)
      // The raw stored value is still exposed on the value layers (admin edits raw); only
      // the effective value folds off.
      expect(JSON.parse(row.effective)).toBe(false)
    })
  })
})

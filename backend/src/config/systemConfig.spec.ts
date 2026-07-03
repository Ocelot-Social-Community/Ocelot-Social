import { createInMemoryPolicyService } from '@src/policy'

import { ENV_REGISTRY } from './envRegistry'
import { systemConfigStatus } from './systemConfig'

import type { NetworkPolicy } from '@src/policy'

// Drive the builder through a real in-memory PolicyService so the effective/override
// folding and env-state semantics are exercised end to end. The SAME env map is handed
// to the policy service and to systemConfigStatus, mirroring production where both read
// process.env.
const rowsFor = (
  env: Record<string, string | undefined> = {},
  values: Partial<NetworkPolicy> = {},
) => {
  const policy = createInMemoryPolicyService(values, env)
  return systemConfigStatus(env, policy)
}

const rowFor = (
  envKey: string,
  env?: Record<string, string | undefined>,
  values?: Partial<NetworkPolicy>,
) => {
  const row = rowsFor(env, values).find((entry) => entry.envKey === envKey)
  if (!row) throw new Error(`no systemConfig row for ${envKey}`)
  return row
}

describe('systemConfigStatus', () => {
  it('emits one row per env var with no duplicates', () => {
    const keys = rowsFor().map((row) => row.envKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('includes plain infrastructure vars alongside the policy-governed ones', () => {
    const keys = rowsFor().map((row) => row.envKey)
    // plain infra (never surfaced before)
    expect(keys).toContain('NEO4J_URI')
    expect(keys).toContain('SMTP_HOST')
    expect(keys).toContain('JWT_SECRET')
    // policy seed + hard requirement
    expect(keys).toContain('API_KEYS_ENABLED')
    expect(keys).toContain('LIVEKIT_API_SECRET')
  })

  it('does not duplicate a policy-governed var as a plain row', () => {
    const liveKitRows = rowsFor().filter((row) => row.envKey === 'LIVEKIT_API_SECRET')
    expect(liveKitRows).toHaveLength(1)
    expect(liveKitRows[0].policyKey).toBe('videoConference')
  })

  describe('secret hygiene', () => {
    it('never returns a secret value, only its presence', () => {
      const row = rowFor('JWT_SECRET', { JWT_SECRET: 'super-secret' })
      expect(row.secret).toBe(true)
      expect(row.state).toBe('set')
      expect(row.envValue).toBeNull()
      expect(row.effective).toBeNull()
      expect(row.softwareDefault).toBeNull()
    })

    it('distinguishes empty from missing for a secret', () => {
      expect(rowFor('JWT_SECRET', { JWT_SECRET: '' }).state).toBe('empty')
      expect(rowFor('JWT_SECRET', {}).state).toBe('missing')
    })

    it("surfaces a secret's software default (a public code constant) but never its env value", () => {
      const row = rowFor('NEO4J_PASSWORD', { NEO4J_PASSWORD: 'deployed-secret' })
      expect(row.secret).toBe(true)
      expect(row.state).toBe('set')
      // deployed value withheld …
      expect(row.envValue).toBeNull()
      expect(row.effective).toBeNull()
      // … but the public software default is shown (so it isn't misreported as "no default").
      expect(row.softwareDefault).toBe('neo4j')
    })
  })

  describe('plain non-secret infrastructure var', () => {
    it('shows the env value and falls back to the software default when unset', () => {
      const set = rowFor('NEO4J_URI', { NEO4J_URI: 'bolt://db:7687' })
      expect(set.secret).toBe(false)
      expect(set.envValue).toBe('bolt://db:7687')
      expect(set.effective).toBe('bolt://db:7687')

      const unset = rowFor('NEO4J_URI', {})
      expect(unset.envValue).toBeNull()
      // effective falls back to the registry software default
      expect(unset.effective).toBe('bolt://localhost:7687')
      expect(unset.softwareDefault).toBe('bolt://localhost:7687')
    })

    it('is never overridable and carries no policy key', () => {
      const row = rowFor('SMTP_HOST', { SMTP_HOST: 'mail.example.org' })
      expect(row.overridable).toBe(false)
      expect(row.policyKey).toBeNull()
      expect(row.blocking).toBe(false)
    })
  })

  describe('policy seed var', () => {
    it('reports the seed value and marks a diverging admin override', () => {
      // env seeds true, admin overrode to false in the DB → override present.
      const row = rowFor(
        'API_KEYS_ENABLED',
        { API_KEYS_ENABLED: 'true' },
        { apiKeysEnabled: false },
      )
      expect(row.overridable).toBe(true)
      expect(row.policyKey).toBe('apiKeysEnabled')
      expect(row.effective).toBe('false')
      expect(row.override).toBe('false')
      expect(row.envValue).toBe('true')
      expect(row.softwareDefault).toBe('false')
    })

    it('has no override when the stored value still equals the env-seeded default', () => {
      // Realistic seeded state: the env seed was materialised into storage on boot,
      // so the stored value matches the configured default → no admin override.
      const row = rowFor('API_KEYS_ENABLED', { API_KEYS_ENABLED: 'true' }, { apiKeysEnabled: true })
      expect(row.effective).toBe('true')
      expect(row.override).toBeNull()
    })

    it('em-dashes the env value when the seed var is unset', () => {
      const row = rowFor('PUBLIC_REGISTRATION', {})
      expect(row.state).toBe('missing')
      expect(row.envValue).toBeNull()
    })
  })

  describe('hard-requirement (requiresEnv) var', () => {
    const LIVEKIT = {
      LIVEKIT_URL: 'wss://lk.example.org',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret',
    }

    it('exposes a non-secret requirement value (the URL) but shows presence, not a value, as effective', () => {
      const url = rowFor('LIVEKIT_URL', LIVEKIT)
      expect(url.secret).toBe(false)
      expect(url.envValue).toBe('wss://lk.example.org')
      expect(url.effective).toBeNull()
      expect(url.overridable).toBe(false)
      expect(url.blocking).toBe(false)
    })

    it('hides a secret requirement value and flags a missing one as blocking', () => {
      const secret = rowFor('LIVEKIT_API_SECRET', { ...LIVEKIT, LIVEKIT_API_SECRET: undefined })
      expect(secret.secret).toBe(true)
      expect(secret.envValue).toBeNull()
      expect(secret.state).toBe('missing')
      expect(secret.blocking).toBe(true)
    })
  })

  it('assigns every registry var a stable category', () => {
    const byKey = Object.fromEntries(rowsFor().map((row) => [row.envKey, row.category]))
    for (const spec of ENV_REGISTRY) {
      expect(byKey[spec.name]).toBe(spec.category)
    }
  })
})

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Unit tests for PolicyService — no DB dependency. The repository is mocked
// so we can verify resolution-order (DB > ENV > Schema-Default) deterministically.
// (no-unsafe-assignment disabled: jest matchers like expect.objectContaining are `any`.)

import {
  PolicyService,
  createInMemoryPolicyService,
  getPolicyService,
  setPolicyServiceForTesting,
  POLICY_CHANGED_CHANNEL,
} from './PolicyService'
import {
  readAllSettings as readAllSettingsImpl,
  readLastChange as readLastChangeImpl,
  seedSetting as seedSettingImpl,
  writeSetting as writeSettingImpl,
  deleteSetting as deleteSettingImpl,
} from './repository'

import type { PolicyPubSub, PolicyChangeEvent } from './PolicyService'

jest.mock('./repository', () => ({
  POLICY_NAMESPACE: 'policy',
  readAllSettings: jest.fn(),
  readLastChange: jest.fn().mockResolvedValue(null),
  seedSetting: jest.fn(),
  writeSetting: jest.fn(),
  deleteSetting: jest.fn(),
}))

const readAllSettings = readAllSettingsImpl as jest.MockedFunction<typeof readAllSettingsImpl>
const readLastChange = readLastChangeImpl as jest.MockedFunction<typeof readLastChangeImpl>
const seedSetting = seedSettingImpl as jest.MockedFunction<typeof seedSettingImpl>
const writeSetting = writeSettingImpl as jest.MockedFunction<typeof writeSettingImpl>
const deleteSetting = deleteSettingImpl as jest.MockedFunction<typeof deleteSettingImpl>

// A minimal stub for the database-context shape that PolicyService passes through.
// The repository is mocked above, so this object is never actually consulted.
const dbStub = {} as never

describe('PolicyService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('init() resolution order', () => {
    it('uses DB value when present (DB wins over ENV and default)', async () => {
      readAllSettings.mockResolvedValue({ publicRegistration: true })

      const svc = new PolicyService(dbStub)
      await svc.init({ PUBLIC_REGISTRATION: 'false' })

      expect(svc.get('publicRegistration')).toBe(true)
      expect(seedSetting).not.toHaveBeenCalledWith(
        expect.anything(),
        'policy',
        'publicRegistration',
        expect.anything(),
        expect.anything(),
      )
    })

    it('seeds DB from ENV when DB is empty', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub)
      await svc.init({ PUBLIC_REGISTRATION: 'true' })

      expect(svc.get('publicRegistration')).toBe(true)
      expect(seedSetting).toHaveBeenCalledWith(
        expect.anything(),
        'policy',
        'publicRegistration',
        true,
        'system:seed',
      )
    })

    it('falls back to schema default when neither DB nor ENV provide a value', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub)
      await svc.init({}) // no env

      // Defaults from packages/config-schema/policy.schema.json
      expect(svc.get('publicRegistration')).toBe(false)
      expect(svc.get('inviteRegistration')).toBe(true)
      expect(svc.get('categoriesActive')).toBe(false)
      expect(svc.get('apiKeysEnabled')).toBe(false)
    })

    it('treats garbage ENV values as undefined (falls through to default)', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub)
      await svc.init({
        PUBLIC_REGISTRATION: 'yes', // not 'true' or 'false'
        INVITE_REGISTRATION: 'no',
      })

      expect(svc.get('publicRegistration')).toBe(false) // default
      expect(svc.get('inviteRegistration')).toBe(true) // default
    })

    it('parses "true" and "false" symmetrically', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub)
      await svc.init({
        PUBLIC_REGISTRATION: 'true',
        INVITE_REGISTRATION: 'false',
        CATEGORIES_ACTIVE: 'true',
        API_KEYS_ENABLED: 'false',
      })

      expect(svc.get('publicRegistration')).toBe(true)
      expect(svc.get('inviteRegistration')).toBe(false)
      expect(svc.get('categoriesActive')).toBe(true)
      expect(svc.get('apiKeysEnabled')).toBe(false)
    })

    it('reseeds (does not adopt) a stored value whose type no longer matches the schema', async () => {
      // A corrupt / un-migrated DB value: a number for a boolean key. It must be
      // treated like a missing value (reseed from ENV/default), not adopted, and
      // must not throw (a bad row may not crash startup).
      readAllSettings.mockResolvedValue({ publicRegistration: 42 })
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const svc = new PolicyService(dbStub)
      await svc.init({ PUBLIC_REGISTRATION: 'true' })

      expect(svc.get('publicRegistration')).toBe(true) // ENV seed, not the stale 42
      expect(seedSetting).toHaveBeenCalledWith(
        expect.anything(),
        'policy',
        'publicRegistration',
        true,
        'system:seed',
      )
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('publicRegistration'))

      warn.mockRestore()
    })
  })

  describe('getVisibleSnapshot()', () => {
    const ALL_KEYS = [
      'apiKeysEnabled',
      'categoriesActive',
      'inviteRegistration',
      'publicRegistration',
    ]

    const initService = async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({})
      return svc
    }

    // Every key is always present (so the GraphQL default resolver never sees
    // undefined); a key the viewer may not see is null, not omitted.
    it('returns authenticated-only keys as null to an anonymous viewer', async () => {
      const svc = await initService()
      const snap = svc.getVisibleSnapshot(null)
      expect(Object.keys(snap).sort()).toEqual(ALL_KEYS)
      expect(snap.apiKeysEnabled).toBeNull()
      expect(snap.publicRegistration).toBe(false) // public key still has its value
    })

    it('exposes authenticated key values to a logged-in (non-admin) viewer', async () => {
      const svc = await initService()
      const snap = svc.getVisibleSnapshot({ role: 'user' })
      expect(Object.keys(snap).sort()).toEqual(ALL_KEYS)
      expect(snap.apiKeysEnabled).toBe(false) // value, not null
    })

    it('exposes everything to an admin (superuser short-circuit)', async () => {
      const svc = await initService()
      const snap = svc.getVisibleSnapshot({ role: 'admin' })
      expect(Object.keys(snap).sort()).toEqual(ALL_KEYS)
      expect(snap.apiKeysEnabled).toBe(false)
    })
  })

  describe('getDefault() / getVisibleDefaults()', () => {
    it('returns the schema default, independent of the current (DB) value', async () => {
      // DB has apiKeysEnabled=true, but its configured default is false.
      readAllSettings.mockResolvedValue({ apiKeysEnabled: true })
      const svc = new PolicyService(dbStub)
      await svc.init({})

      expect(svc.get('apiKeysEnabled')).toBe(true) // current value
      expect(svc.getDefault('apiKeysEnabled')).toBe(false) // configured default
      expect(svc.getDefault('inviteRegistration')).toBe(true) // schema default
    })

    it('returns the ENV-seeded value as the default when configured', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({ API_KEYS_ENABLED: 'true', PUBLIC_REGISTRATION: 'true' })

      expect(svc.getDefault('apiKeysEnabled')).toBe(true)
      expect(svc.getDefault('publicRegistration')).toBe(true)
    })

    it('scopes getVisibleDefaults by canView (anon hides apiKeysEnabled, admin sees all)', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({})

      expect(svc.getVisibleDefaults(null).apiKeysEnabled).toBeNull()
      expect(svc.getVisibleDefaults(null).inviteRegistration).toBe(true)
      expect(svc.getVisibleDefaults({ role: 'admin' }).apiKeysEnabled).toBe(false)
    })
  })

  describe('getLastChange()', () => {
    it('is null before anything changed', async () => {
      readAllSettings.mockResolvedValue({})
      readLastChange.mockResolvedValue(null)
      const svc = new PolicyService(dbStub)
      await svc.init({})
      expect(svc.getLastChange()).toBeNull()
    })

    it('is read from the repository at init', async () => {
      readAllSettings.mockResolvedValue({})
      readLastChange.mockResolvedValue({ actor: 'someone', timestamp: '2020-01-01T00:00:00.000Z' })
      const svc = new PolicyService(dbStub)
      await svc.init({})
      expect(svc.getLastChange()).toEqual({
        actor: 'someone',
        timestamp: '2020-01-01T00:00:00.000Z',
      })
    })

    it('reflects the actor/timestamp after a set()', async () => {
      readAllSettings.mockResolvedValue({})
      readLastChange.mockResolvedValue(null)
      const svc = new PolicyService(dbStub)
      await svc.init({})
      const event = await svc.set('publicRegistration', true, 'admin-id-1')
      expect(svc.getLastChange()).toEqual({ actor: 'admin-id-1', timestamp: event.timestamp })
    })

    it('updates on a remote change (applyExternalChange)', async () => {
      readAllSettings.mockResolvedValue({})
      readLastChange.mockResolvedValue(null)
      const svc = new PolicyService(dbStub)
      await svc.init({})
      svc.applyExternalChange({
        key: 'publicRegistration',
        value: true,
        actor: 'remote-admin',
        timestamp: '2021-02-03T04:05:06.000Z',
      })
      expect(svc.getLastChange()).toEqual({
        actor: 'remote-admin',
        timestamp: '2021-02-03T04:05:06.000Z',
      })
    })
  })

  describe('createInMemoryPolicyService (test factory)', () => {
    it('returns provided values without touching the repository', () => {
      const svc = createInMemoryPolicyService({
        publicRegistration: true,
        categoriesActive: true,
      })
      expect(svc.get('publicRegistration')).toBe(true)
      expect(svc.get('categoriesActive')).toBe(true)
      // Unspecified keys still fall back to schema default
      expect(svc.get('inviteRegistration')).toBe(true) // default
      expect(svc.get('apiKeysEnabled')).toBe(false) // default
      expect(readAllSettings).not.toHaveBeenCalled()
    })

    it('has a no-op init() that touches no DB (the double has none)', async () => {
      const svc = createInMemoryPolicyService({ publicRegistration: true })
      // Must resolve without hitting the repository / undefined this.db.
      await expect(svc.init({})).resolves.toBeUndefined()
      expect(readAllSettings).not.toHaveBeenCalled()
      expect(svc.get('publicRegistration')).toBe(true) // cache preserved
    })
  })

  describe('set()', () => {
    it('persists the value, updates the cache, and publishes a change event', async () => {
      readAllSettings.mockResolvedValue({})
      const publish = jest.fn()
      const pubsub: PolicyPubSub = {
        publish,
        subscribe: jest.fn().mockResolvedValue(1),
        unsubscribe: jest.fn(),
      }

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub)

      const event = await svc.set('publicRegistration', true, 'admin-id-1')

      expect(svc.get('publicRegistration')).toBe(true)
      expect(writeSetting).toHaveBeenCalledWith(
        expect.anything(),
        'policy',
        'publicRegistration',
        true,
        'admin-id-1',
      )
      expect(publish).toHaveBeenCalledWith(
        POLICY_CHANGED_CHANNEL,
        expect.objectContaining({
          policyChanged: expect.objectContaining({
            key: 'publicRegistration',
            value: true,
            actor: 'admin-id-1',
          }),
        }),
      )
      expect(event.key).toBe('publicRegistration')
      expect(event.value).toBe(true)
    })

    it('rejects unknown keys', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({})

      await expect(svc.set('nonsense' as never, true as never, 'actor')).rejects.toThrow(
        /Unknown policy key/,
      )
    })

    it('rejects type mismatches (string for boolean key)', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({})

      await expect(svc.set('publicRegistration', 'true' as never, 'actor')).rejects.toThrow(
        /Type mismatch/,
      )
    })

    it('does not throw when no pubsub is configured', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({}) // no pubsub

      await expect(svc.set('publicRegistration', true, 'actor')).resolves.toBeDefined()
      expect(svc.get('publicRegistration')).toBe(true)
    })

    it('still commits and logs (no throw / no unhandled rejection) when publish fails', async () => {
      readAllSettings.mockResolvedValue({})
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const pubsub: PolicyPubSub = {
        publish: jest.fn().mockRejectedValue(new Error('redis down')),
        subscribe: jest.fn().mockResolvedValue(1),
        unsubscribe: jest.fn(),
      }

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub)

      // The broadcast is fire-and-forget: a publish failure must not fail set().
      await expect(svc.set('publicRegistration', true, 'actor')).resolves.toBeDefined()
      expect(svc.get('publicRegistration')).toBe(true) // commit applied regardless

      // Let the catch on the floating publish promise run, then assert it logged.
      await Promise.resolve()
      await Promise.resolve()
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to publish'),
        expect.any(Error),
      )

      warn.mockRestore()
    })
  })

  describe('reset()', () => {
    it('deletes the DB entry and falls back to ENV seed', async () => {
      readAllSettings.mockResolvedValue({ publicRegistration: true })
      const svc = new PolicyService(dbStub)
      await svc.init({ PUBLIC_REGISTRATION: 'false' })

      // Initially DB wins
      expect(svc.get('publicRegistration')).toBe(true)

      await svc.reset('publicRegistration', 'admin-id-1')

      expect(deleteSetting).toHaveBeenCalledWith(expect.anything(), 'policy', 'publicRegistration')
      // After reset, ENV value applies
      expect(svc.get('publicRegistration')).toBe(false)
    })

    it('falls back to schema default when no ENV is set', async () => {
      readAllSettings.mockResolvedValue({ publicRegistration: true })
      const svc = new PolicyService(dbStub)
      await svc.init({}) // no ENV

      await svc.reset('publicRegistration', 'actor')

      expect(svc.get('publicRegistration')).toBe(false) // schema default
    })

    it('publishes a change event', async () => {
      readAllSettings.mockResolvedValue({})
      const publish = jest.fn()
      const pubsub: PolicyPubSub = {
        publish,
        subscribe: jest.fn().mockResolvedValue(1),
        unsubscribe: jest.fn(),
      }

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub)
      publish.mockClear() // ignore init-time publishes (none expected, but defensive)

      await svc.reset('publicRegistration', 'actor')

      expect(publish).toHaveBeenCalledWith(
        POLICY_CHANGED_CHANNEL,
        expect.objectContaining({
          policyChanged: expect.objectContaining({ key: 'publicRegistration' }),
        }),
      )
    })
  })

  describe('applyExternalChange()', () => {
    it('updates the cache when a remote instance publishes a change', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({})

      expect(svc.get('publicRegistration')).toBe(false)

      svc.applyExternalChange({
        key: 'publicRegistration',
        value: true,
        actor: 'remote-admin',
        timestamp: new Date().toISOString(),
      })

      expect(svc.get('publicRegistration')).toBe(true)
    })

    it('ignores unknown keys gracefully', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({})

      expect(() => {
        svc.applyExternalChange({
          key: 'nonsense',
          value: true,
          actor: 'remote',
          timestamp: '',
        })
      }).not.toThrow()
    })

    it('discards a change whose value type does not match the schema', async () => {
      readAllSettings.mockResolvedValue({})
      readLastChange.mockResolvedValue(null)
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const svc = new PolicyService(dbStub)
      await svc.init({})

      // A wrong-typed cross-instance event (string for a boolean key) must be
      // dropped, not adopted — and must not move lastChange.
      svc.applyExternalChange({
        key: 'publicRegistration',
        value: 'not-a-bool',
        actor: 'remote',
        timestamp: '2021-02-03T04:05:06.000Z',
      })

      expect(svc.get('publicRegistration')).toBe(false) // unchanged default
      expect(svc.getLastChange()).toBeNull() // not moved by the rejected event
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('publicRegistration'))

      warn.mockRestore()
    })
  })

  describe('init() with pubsub', () => {
    it('subscribes to POLICY_CHANGED_CHANNEL', async () => {
      readAllSettings.mockResolvedValue({})
      const subscribe = jest.fn().mockResolvedValue(42)
      const pubsub: PolicyPubSub = {
        publish: jest.fn(),
        subscribe,
        unsubscribe: jest.fn(),
      }

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub)

      expect(subscribe).toHaveBeenCalledWith(POLICY_CHANGED_CHANNEL, expect.any(Function))
    })

    it('applies a remote change delivered through the subscription callback', async () => {
      readAllSettings.mockResolvedValue({})
      let onMessage: ((payload: { policyChanged: PolicyChangeEvent }) => void) | undefined
      const pubsub: PolicyPubSub = {
        publish: jest.fn(),
        subscribe: jest.fn().mockImplementation(async (_channel, handler) => {
          onMessage = handler as typeof onMessage
          await Promise.resolve()
          return 7
        }),
        unsubscribe: jest.fn(),
      }

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub)
      expect(svc.get('publicRegistration')).toBe(false)

      onMessage?.({
        policyChanged: {
          key: 'publicRegistration',
          value: true,
          actor: 'remote-admin',
          timestamp: '2022-01-01T00:00:00.000Z',
        },
      })

      expect(svc.get('publicRegistration')).toBe(true)
      expect(svc.getLastChange()).toEqual({
        actor: 'remote-admin',
        timestamp: '2022-01-01T00:00:00.000Z',
      })
    })

    it('does not lose a change that arrives during init (subscribe-first; snapshot does not clobber)', async () => {
      let onMessage: ((payload: { policyChanged: PolicyChangeEvent }) => void) | undefined
      const pubsub: PolicyPubSub = {
        publish: jest.fn(),
        subscribe: jest.fn().mockImplementation(async (_channel, handler) => {
          onMessage = handler as typeof onMessage
          await Promise.resolve()
          return 1
        }),
        unsubscribe: jest.fn(),
      }
      // Another instance publishes a change while we read the (now stale) snapshot.
      // Because we subscribe BEFORE reading, the callback is already live; the
      // snapshot loop must not overwrite the value the event delivered.
      readAllSettings.mockImplementation(async () => {
        onMessage?.({
          policyChanged: {
            key: 'publicRegistration',
            value: true,
            actor: 'remote',
            timestamp: '2022-01-01T00:00:00.000Z',
          },
        })
        await Promise.resolve()
        return { publicRegistration: false } // stale snapshot value
      })

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub)

      // The concurrent event (true) wins over the stale snapshot (false).
      expect(svc.get('publicRegistration')).toBe(true)
    })

    it('does not clobber an admin change that arrives while the init seed is writing', async () => {
      readAllSettings.mockResolvedValue({}) // key missing → seed path runs
      let onMessage: ((payload: { policyChanged: PolicyChangeEvent }) => void) | undefined
      const pubsub: PolicyPubSub = {
        publish: jest.fn(),
        subscribe: jest.fn().mockImplementation(async (_channel, handler) => {
          onMessage = handler as typeof onMessage
          await Promise.resolve()
          return 1
        }),
        unsubscribe: jest.fn(),
      }
      // While we seed 'publicRegistration' (default false), a concurrent admin
      // set() on another instance commits and its change event arrives mid-write.
      // (seedSetting is write-if-missing in the repo; here we assert the in-memory
      // cache re-check after the await keeps the fresher event value.)
      seedSetting.mockImplementation(async (_db, _ns, key) => {
        if (key === 'publicRegistration') {
          onMessage?.({
            policyChanged: {
              key: 'publicRegistration',
              value: true,
              actor: 'remote',
              timestamp: '2022-01-01T00:00:00.000Z',
            },
          })
        }
        await Promise.resolve()
      })

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub) // ENV/default would be false

      expect(svc.get('publicRegistration')).toBe(true) // admin change survived
    })
  })

  describe('shutdown()', () => {
    it('unsubscribes from the pubsub channel', async () => {
      readAllSettings.mockResolvedValue({})
      const unsubscribe = jest.fn()
      const pubsub: PolicyPubSub = {
        publish: jest.fn(),
        subscribe: jest.fn().mockResolvedValue(99),
        unsubscribe,
      }

      const svc = new PolicyService(dbStub)
      await svc.init({}, pubsub)
      svc.shutdown()

      expect(unsubscribe).toHaveBeenCalledWith(99)
      // Idempotent: a second shutdown does not unsubscribe again.
      svc.shutdown()
      expect(unsubscribe).toHaveBeenCalledTimes(1)
    })

    it('is a no-op when no pubsub was configured', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub)
      await svc.init({}) // no pubsub
      expect(() => {
        svc.shutdown()
      }).not.toThrow()
    })
  })

  describe('get() before init()', () => {
    it('falls back to the schema default', () => {
      const svc = new PolicyService(dbStub)
      expect(svc.get('inviteRegistration')).toBe(true) // schema default, no DB access
      expect(svc.get('publicRegistration')).toBe(false)
      expect(readAllSettings).not.toHaveBeenCalled()
    })
  })

  describe('getPolicyService() singleton', () => {
    afterEach(() => {
      setPolicyServiceForTesting(undefined)
    })

    it('returns the same lazily-constructed instance', () => {
      setPolicyServiceForTesting(undefined)
      const a = getPolicyService()
      const b = getPolicyService()
      expect(a).toBe(b)
    })

    it('can be swapped out for testing', () => {
      const fake = createInMemoryPolicyService({ publicRegistration: true })
      setPolicyServiceForTesting(fake)
      expect(getPolicyService()).toBe(fake)
    })
  })
})

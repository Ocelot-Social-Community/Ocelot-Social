// Unit tests for PolicyService — no DB dependency. The repository is mocked
// so we can verify resolution-order (DB > ENV > Schema-Default) deterministically.

jest.mock('./repository', () => ({
  POLICY_NAMESPACE: 'policy',
  ensureConstraint: jest.fn().mockResolvedValue(undefined),
  readAllSettings: jest.fn(),
  writeSetting: jest.fn(),
  deleteSetting: jest.fn(),
}))

import { PolicyService, createInMemoryPolicyService, POLICY_CHANGED_CHANNEL } from './PolicyService'
import * as repo from './repository'

import type { PolicyPubSub } from './PolicyService'

const readAllSettings = repo.readAllSettings as jest.MockedFunction<typeof repo.readAllSettings>
const writeSetting = repo.writeSetting as jest.MockedFunction<typeof repo.writeSetting>
const deleteSetting = repo.deleteSetting as jest.MockedFunction<typeof repo.deleteSetting>

// A minimal stub for the database-context shape that PolicyService passes through.
// The repository is mocked above, so this object is never actually consulted.
const dbStub = {} as Parameters<typeof PolicyService.prototype.init>[0] extends NodeJS.ProcessEnv
  ? unknown
  : never

describe('PolicyService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('init() resolution order', () => {
    it('uses DB value when present (DB wins over ENV and default)', async () => {
      readAllSettings.mockResolvedValue({ publicRegistration: true })

      const svc = new PolicyService(dbStub as never)
      await svc.init({ PUBLIC_REGISTRATION: 'false' })

      expect(svc.get('publicRegistration')).toBe(true)
      expect(writeSetting).not.toHaveBeenCalledWith(
        expect.anything(),
        'policy',
        'publicRegistration',
        expect.anything(),
        expect.anything(),
      )
    })

    it('seeds DB from ENV when DB is empty', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub as never)
      await svc.init({ PUBLIC_REGISTRATION: 'true' })

      expect(svc.get('publicRegistration')).toBe(true)
      expect(writeSetting).toHaveBeenCalledWith(
        expect.anything(),
        'policy',
        'publicRegistration',
        true,
        'system:seed',
      )
    })

    it('falls back to schema default when neither DB nor ENV provide a value', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub as never)
      await svc.init({}) // no env

      // Defaults from packages/config-schema/policy.schema.json
      expect(svc.get('publicRegistration')).toBe(false)
      expect(svc.get('inviteRegistration')).toBe(true)
      expect(svc.get('categoriesActive')).toBe(false)
      expect(svc.get('apiKeysEnabled')).toBe(false)
    })

    it('treats garbage ENV values as undefined (falls through to default)', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub as never)
      await svc.init({
        PUBLIC_REGISTRATION: 'yes', // not 'true' or 'false'
        INVITE_REGISTRATION: 'no',
      })

      expect(svc.get('publicRegistration')).toBe(false) // default
      expect(svc.get('inviteRegistration')).toBe(true) // default
    })

    it('parses "true" and "false" symmetrically', async () => {
      readAllSettings.mockResolvedValue({})

      const svc = new PolicyService(dbStub as never)
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
  })

  describe('getSnapshot()', () => {
    it('returns all public-visibility keys (all 4 are public for B5)', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub as never)
      await svc.init({})

      const snap = svc.getSnapshot('public')
      expect(Object.keys(snap).sort()).toEqual([
        'apiKeysEnabled',
        'categoriesActive',
        'inviteRegistration',
        'publicRegistration',
      ])
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

      const svc = new PolicyService(dbStub as never)
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
      const svc = new PolicyService(dbStub as never)
      await svc.init({})

      await expect(
        svc.set('nonsense' as never, true as never, 'actor'),
      ).rejects.toThrow(/Unknown policy key/)
    })

    it('rejects type mismatches (string for boolean key)', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub as never)
      await svc.init({})

      await expect(
        svc.set('publicRegistration', 'true' as never, 'actor'),
      ).rejects.toThrow(/Type mismatch/)
    })

    it('does not throw when no pubsub is configured', async () => {
      readAllSettings.mockResolvedValue({})
      const svc = new PolicyService(dbStub as never)
      await svc.init({}) // no pubsub

      await expect(svc.set('publicRegistration', true, 'actor')).resolves.toBeDefined()
      expect(svc.get('publicRegistration')).toBe(true)
    })
  })

  describe('reset()', () => {
    it('deletes the DB entry and falls back to ENV seed', async () => {
      readAllSettings.mockResolvedValue({ publicRegistration: true })
      const svc = new PolicyService(dbStub as never)
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
      const svc = new PolicyService(dbStub as never)
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

      const svc = new PolicyService(dbStub as never)
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
      const svc = new PolicyService(dbStub as never)
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
      const svc = new PolicyService(dbStub as never)
      await svc.init({})

      expect(() =>
        svc.applyExternalChange({
          key: 'nonsense',
          value: true,
          actor: 'remote',
          timestamp: '',
        }),
      ).not.toThrow()
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

      const svc = new PolicyService(dbStub as never)
      await svc.init({}, pubsub)

      expect(subscribe).toHaveBeenCalledWith(POLICY_CHANGED_CHANNEL, expect.any(Function))
    })
  })
})

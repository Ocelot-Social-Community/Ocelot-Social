// Unit tests for PolicyService — no DB dependency. The repository is mocked
// so we can verify resolution-order (DB > ENV > Schema-Default) deterministically.

jest.mock('./repository', () => ({
  POLICY_NAMESPACE: 'policy',
  ensureConstraint: jest.fn().mockResolvedValue(undefined),
  readAllSettings: jest.fn(),
  writeSetting: jest.fn(),
}))

import { PolicyService, createInMemoryPolicyService } from './PolicyService'
import * as repo from './repository'

const readAllSettings = repo.readAllSettings as jest.MockedFunction<typeof repo.readAllSettings>
const writeSetting = repo.writeSetting as jest.MockedFunction<typeof repo.writeSetting>

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
})

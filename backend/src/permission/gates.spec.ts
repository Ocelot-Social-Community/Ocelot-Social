import {
  isGateOpen,
  isPermissionAvailable,
  isPermissionGatePolicyKey,
  PERMISSION_GATE_POLICY_KEYS,
} from './gates'

import type { GateContext } from './gates'
import type { PermissionGate } from './types'

// A gate now reads exactly one thing: the backing policy's effective value (which the
// PolicyService already folds with env availability). The mock takes the list of gates
// that are effectively on, so a wrong gate key can't pass unnoticed.
const ctx = (open: PermissionGate[] = []): GateContext => ({
  policy: { getEffective: (key: PermissionGate) => open.includes(key) },
})

describe('permission gates', () => {
  describe('isGateOpen', () => {
    it('follows the backing policy effective value', () => {
      expect(isGateOpen('videoConference', ctx(['videoConference']))).toBe(true)
      expect(isGateOpen('videoConference', ctx([]))).toBe(false)
      expect(isGateOpen('apiKeysEnabled', ctx(['apiKeysEnabled']))).toBe(true)
      expect(isGateOpen('apiKeysEnabled', ctx([]))).toBe(false)
    })

    it('reads exactly the gate key', () => {
      const getEffective = jest.fn((key: PermissionGate) => key === 'videoConference')
      expect(isGateOpen('videoConference', { policy: { getEffective } })).toBe(true)
      expect(getEffective).toHaveBeenCalledWith('videoConference')
    })

    it('is closed when no policy service is present', () => {
      expect(isGateOpen('videoConference', { policy: undefined })).toBe(false)
    })
  })

  describe('isPermissionAvailable', () => {
    it('ungated permissions are always available', () => {
      const closed = ctx() // every gate closed
      expect(isPermissionAvailable('post.create', closed)).toBe(true)
      expect(isPermissionAvailable('role.manage', closed)).toBe(true)
    })

    it('videoCall.* tracks the videoConference policy gate', () => {
      for (const key of [
        'videoCall.create_public',
        'videoCall.create_closed',
        'videoCall.create_hidden',
      ] as const) {
        expect(isPermissionAvailable(key, ctx(['videoConference']))).toBe(true)
        expect(isPermissionAvailable(key, ctx([]))).toBe(false)
      }
    })

    it('apiKey.create tracks the apiKeysEnabled policy gate', () => {
      expect(isPermissionAvailable('apiKey.create', ctx(['apiKeysEnabled']))).toBe(true)
      expect(isPermissionAvailable('apiKey.create', ctx([]))).toBe(false)
    })
  })

  describe('isPermissionGatePolicyKey', () => {
    it('flags both gate policy keys', () => {
      expect(isPermissionGatePolicyKey('apiKeysEnabled')).toBe(true)
      expect(isPermissionGatePolicyKey('videoConference')).toBe(true)
    })

    it('does not flag unrelated policy keys', () => {
      expect(isPermissionGatePolicyKey('apiKeysMaxPerUser')).toBe(false)
      expect(isPermissionGatePolicyKey('categoriesActive')).toBe(false)
    })

    it('exposes the set it checks against', () => {
      expect(PERMISSION_GATE_POLICY_KEYS).toContain('apiKeysEnabled')
      expect(PERMISSION_GATE_POLICY_KEYS).toContain('videoConference')
    })
  })
})

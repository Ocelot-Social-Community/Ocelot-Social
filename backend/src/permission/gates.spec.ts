import { jest } from '@jest/globals'

import {
  blockingGateFor,
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

    it('videoCall.* needs BOTH the videoConference and groupsEnabled gates (AND)', () => {
      for (const key of [
        'videoCall.create_public',
        'videoCall.create_closed',
        'videoCall.create_hidden',
      ] as const) {
        // Both open ⇒ available; either one closed ⇒ not available.
        expect(isPermissionAvailable(key, ctx(['videoConference', 'groupsEnabled']))).toBe(true)
        expect(isPermissionAvailable(key, ctx(['videoConference']))).toBe(false)
        expect(isPermissionAvailable(key, ctx(['groupsEnabled']))).toBe(false)
        expect(isPermissionAvailable(key, ctx([]))).toBe(false)
      }
    })

    it('group.create_* tracks the groupsEnabled policy gate', () => {
      for (const key of [
        'group.create_public',
        'group.create_closed',
        'group.create_hidden',
      ] as const) {
        expect(isPermissionAvailable(key, ctx(['groupsEnabled']))).toBe(true)
        expect(isPermissionAvailable(key, ctx([]))).toBe(false)
      }
    })

    it('apiKey.create tracks the apiKeysEnabled policy gate', () => {
      expect(isPermissionAvailable('apiKey.create', ctx(['apiKeysEnabled']))).toBe(true)
      expect(isPermissionAvailable('apiKey.create', ctx([]))).toBe(false)
    })
  })

  describe('blockingGateFor', () => {
    it('is null for an ungated permission and for a fully-open gated one', () => {
      expect(blockingGateFor('post.create', ctx())).toBeNull()
      expect(
        blockingGateFor('videoCall.create_public', ctx(['videoConference', 'groupsEnabled'])),
      ).toBeNull()
    })

    it('returns the first currently-closed gate (declaration order)', () => {
      // videoConference is declared first in the catalog for videoCall.create_*, so when
      // both are closed it is the one surfaced; opening it reveals groupsEnabled next.
      expect(blockingGateFor('videoCall.create_public', ctx([]))).toBe('videoConference')
      expect(blockingGateFor('videoCall.create_public', ctx(['videoConference']))).toBe(
        'groupsEnabled',
      )
      expect(blockingGateFor('videoCall.create_public', ctx(['groupsEnabled']))).toBe(
        'videoConference',
      )
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

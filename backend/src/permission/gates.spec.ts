import {
  isGateOpen,
  isPermissionAvailable,
  isPermissionGatePolicyKey,
  PERMISSION_GATE_POLICY_KEYS,
} from './gates'

import type { GateContext } from './gates'

const ctx = (overrides: Partial<GateContext> = {}): GateContext => ({
  config: { LIVEKIT_ENABLED: false },
  policy: { get: () => false },
  ...overrides,
})

describe('permission gates', () => {
  describe('isGateOpen', () => {
    it('videoCall follows config.LIVEKIT_ENABLED', () => {
      expect(isGateOpen('videoCall', ctx({ config: { LIVEKIT_ENABLED: true } }))).toBe(true)
      expect(isGateOpen('videoCall', ctx({ config: { LIVEKIT_ENABLED: false } }))).toBe(false)
    })

    it('apiKeys reads exactly the apiKeysEnabled policy flag', () => {
      // Key-aware mock: returns true ONLY for 'apiKeysEnabled', so querying any other key
      // would yield false and fail this test (a wrong key can't pass unnoticed).
      const get = jest.fn((key: 'apiKeysEnabled') => key === 'apiKeysEnabled')
      expect(isGateOpen('apiKeys', ctx({ policy: { get } }))).toBe(true)
      expect(get).toHaveBeenCalledWith('apiKeysEnabled')
      expect(isGateOpen('apiKeys', ctx({ policy: { get: () => false } }))).toBe(false)
    })

    it('apiKeys is closed when no policy service is present', () => {
      expect(isGateOpen('apiKeys', ctx({ policy: undefined }))).toBe(false)
    })
  })

  describe('isPermissionAvailable', () => {
    it('ungated permissions are always available', () => {
      const closed = ctx() // both gates closed
      expect(isPermissionAvailable('post.create', closed)).toBe(true)
      expect(isPermissionAvailable('role.manage', closed)).toBe(true)
    })

    it('videoCall.* tracks the videoCall gate', () => {
      for (const key of [
        'videoCall.create_public',
        'videoCall.create_closed',
        'videoCall.create_hidden',
      ] as const) {
        expect(isPermissionAvailable(key, ctx({ config: { LIVEKIT_ENABLED: true } }))).toBe(true)
        expect(isPermissionAvailable(key, ctx({ config: { LIVEKIT_ENABLED: false } }))).toBe(false)
      }
    })

    it('apiKey.create tracks the apiKeys gate (via the apiKeysEnabled key)', () => {
      const get = jest.fn((key: 'apiKeysEnabled') => key === 'apiKeysEnabled')
      expect(isPermissionAvailable('apiKey.create', ctx({ policy: { get } }))).toBe(true)
      expect(get).toHaveBeenCalledWith('apiKeysEnabled')
      expect(isPermissionAvailable('apiKey.create', ctx({ policy: { get: () => false } }))).toBe(
        false,
      )
    })
  })

  describe('isPermissionGatePolicyKey', () => {
    it('flags the apiKeys gate policy key (the runtime-toggle gate)', () => {
      expect(isPermissionGatePolicyKey('apiKeysEnabled')).toBe(true)
    })

    it('does not flag unrelated policy keys', () => {
      expect(isPermissionGatePolicyKey('apiKeysMaxPerUser')).toBe(false)
      expect(isPermissionGatePolicyKey('categoriesActive')).toBe(false)
    })

    it('exposes the set it checks against', () => {
      expect(PERMISSION_GATE_POLICY_KEYS).toContain('apiKeysEnabled')
    })
  })
})

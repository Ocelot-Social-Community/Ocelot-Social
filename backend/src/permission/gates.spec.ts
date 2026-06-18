import { isGateOpen, isPermissionAvailable } from './gates'

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

    it('apiKeys follows the apiKeysEnabled policy flag', () => {
      expect(isGateOpen('apiKeys', ctx({ policy: { get: () => true } }))).toBe(true)
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

    it('apiKey.create tracks the apiKeys gate', () => {
      expect(isPermissionAvailable('apiKey.create', ctx({ policy: { get: () => true } }))).toBe(
        true,
      )
      expect(isPermissionAvailable('apiKey.create', ctx({ policy: { get: () => false } }))).toBe(
        false,
      )
    })
  })
})

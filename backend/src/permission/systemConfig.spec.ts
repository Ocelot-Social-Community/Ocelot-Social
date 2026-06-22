import { systemConfigStatus } from './systemConfig'

import type { SystemConfigContext } from './systemConfig'

const ctx = (overrides: Partial<SystemConfigContext['config']> = {}): SystemConfigContext => ({
  config: {
    LIVEKIT_ENABLED: false,
    LIVEKIT_URL: undefined,
    LIVEKIT_API_KEY: undefined,
    LIVEKIT_API_SECRET: undefined,
    ...overrides,
  },
  policy: { get: () => false },
})

const gateOf = (gate: string, c: SystemConfigContext) => {
  const found = systemConfigStatus(c).find((g) => g.gate === gate)
  if (!found) throw new Error(`no status for gate ${gate}`)
  return found
}

describe('systemConfigStatus', () => {
  it('reports videoCall as an env-backed gate with its three LiveKit keys', () => {
    const videoCall = gateOf('videoCall', ctx())
    expect(videoCall.source).toBe('env')
    expect(videoCall.policyKey).toBeNull()
    expect(videoCall.keys.map((k) => k.key)).toEqual([
      'LIVEKIT_URL',
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET',
    ])
  })

  it('mirrors LIVEKIT_ENABLED on the videoCall gate', () => {
    expect(gateOf('videoCall', ctx({ LIVEKIT_ENABLED: true })).open).toBe(true)
    expect(gateOf('videoCall', ctx({ LIVEKIT_ENABLED: false })).open).toBe(false)
  })

  describe('key presence state', () => {
    it('missing when undefined, empty when blank, set when present', () => {
      const c = ctx({
        LIVEKIT_URL: 'wss://lk.example.org',
        LIVEKIT_API_KEY: '',
        LIVEKIT_API_SECRET: undefined,
      })
      const byKey = Object.fromEntries(gateOf('videoCall', c).keys.map((k) => [k.key, k]))
      expect(byKey.LIVEKIT_URL.state).toBe('set')
      expect(byKey.LIVEKIT_API_KEY.state).toBe('empty')
      expect(byKey.LIVEKIT_API_SECRET.state).toBe('missing')
    })
  })

  describe('secret hygiene', () => {
    it('never returns a secret value, even when set', () => {
      const c = ctx({
        LIVEKIT_URL: 'wss://lk.example.org',
        LIVEKIT_API_KEY: 'APIxxxxxxxx',
        LIVEKIT_API_SECRET: 'supersecret',
      })
      const byKey = Object.fromEntries(gateOf('videoCall', c).keys.map((k) => [k.key, k]))
      // non-secret URL is exposed for diagnostics
      expect(byKey.LIVEKIT_URL.secret).toBe(false)
      expect(byKey.LIVEKIT_URL.value).toBe('wss://lk.example.org')
      // secrets are masked: state set, value null
      expect(byKey.LIVEKIT_API_KEY.secret).toBe(true)
      expect(byKey.LIVEKIT_API_KEY.state).toBe('set')
      expect(byKey.LIVEKIT_API_KEY.value).toBeNull()
      expect(byKey.LIVEKIT_API_SECRET.value).toBeNull()
    })
  })

  describe('apiKeys gate (policy-backed)', () => {
    it('is policy-sourced, points at the policy key and carries no env keys', () => {
      const apiKeys = gateOf('apiKeys', ctx())
      expect(apiKeys.source).toBe('policy')
      expect(apiKeys.policyKey).toBe('apiKeysEnabled')
      expect(apiKeys.keys).toEqual([])
    })

    it('open follows exactly the apiKeysEnabled policy flag', () => {
      const get = jest.fn((key: 'apiKeysEnabled') => key === 'apiKeysEnabled')
      const open = gateOf('apiKeys', { config: { LIVEKIT_ENABLED: false }, policy: { get } }).open
      expect(open).toBe(true)
      expect(get).toHaveBeenCalledWith('apiKeysEnabled')
      expect(
        gateOf('apiKeys', { config: { LIVEKIT_ENABLED: false }, policy: undefined }).open,
      ).toBe(false)
    })
  })
})

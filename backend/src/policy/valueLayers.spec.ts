import { createInMemoryPolicyService, policyValueLayers } from './index'

// Driven through a real in-memory PolicyService so the effective/default folding is
// exercised exactly as in production; the same helper feeds both the policyConfig resolver
// and systemConfigStatus, which is why the encoding lives in one place.
describe('policyValueLayers', () => {
  it('JSON-encodes all three layers of a boolean key with no override', () => {
    const policy = createInMemoryPolicyService({}, {})
    expect(policyValueLayers(policy, 'apiKeysEnabled')).toEqual({
      effective: 'false',
      softwareDefault: 'false',
      configuredDefault: 'false',
    })
  })

  it('JSON-encodes an integer key as a number literal', () => {
    const policy = createInMemoryPolicyService({}, {})
    expect(policyValueLayers(policy, 'maxPinnedPosts')).toEqual({
      effective: '1',
      softwareDefault: '1',
      configuredDefault: '1',
    })
  })

  it('reflects a diverging admin override in effective vs the env-seeded configured default', () => {
    // env seeds the default true; the admin stored false → effective and configuredDefault
    // diverge, which is exactly what the config tab reads as an "override present".
    const policy = createInMemoryPolicyService(
      { apiKeysEnabled: false },
      { API_KEYS_ENABLED: 'true' },
    )
    const layers = policyValueLayers(policy, 'apiKeysEnabled')
    expect(layers.effective).toBe('false')
    expect(layers.configuredDefault).toBe('true')
    // The software default is the schema baseline, independent of the env seed.
    expect(layers.softwareDefault).toBe('false')
  })
})

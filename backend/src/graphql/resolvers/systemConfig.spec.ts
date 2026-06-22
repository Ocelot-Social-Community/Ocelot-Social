import resolvers from './systemConfig'

import type { Context } from '@src/context'

// Thin pass-through resolver: the status logic itself is covered exhaustively in
// permission/systemConfig.spec.ts. Here we only assert it delegates with the request
// context (config + policy) and shapes the result as the gate list.
describe('systemConfig resolver', () => {
  const context = {
    config: {
      LIVEKIT_ENABLED: true,
      LIVEKIT_URL: 'wss://lk.example.org',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret',
    },
    policy: { get: () => true },
  } as unknown as Context

  it('returns the feature-gate status derived from the context', () => {
    const result = resolvers.Query.systemConfig(null, null, context)
    expect(result.map((g) => g.gate)).toEqual(['videoCall', 'apiKeys'])
    const videoCall = result.find((g) => g.gate === 'videoCall')
    expect(videoCall?.open).toBe(true)
    // secret value never surfaces through the resolver
    const secretKey = videoCall?.keys.find((k) => k.key === 'LIVEKIT_API_SECRET')
    expect(secretKey?.value).toBeNull()
    expect(secretKey?.state).toBe('set')
  })
})

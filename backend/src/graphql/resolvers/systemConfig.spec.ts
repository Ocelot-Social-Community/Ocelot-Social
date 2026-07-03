import { createInMemoryPolicyService } from '@src/policy'

import resolvers from './systemConfig'

import type { Context } from '@src/context'

describe('systemConfig resolver', () => {
  // The resolver reads values from process.env (in production the same source the
  // policy service was initialised with), so assert structure/secret-hygiene rather
  // than specific env values, which depend on the test process's environment.
  it('returns a row per recognised env var and never surfaces a secret value', () => {
    const policy = createInMemoryPolicyService()
    const rows = resolvers.Query.systemConfig(null, null, { policy } as unknown as Context)
    expect(rows.find((row) => row.envKey === 'NEO4J_URI')).toBeDefined()
    // A secret is present but never surfaces a value.
    expect(rows.find((row) => row.envKey === 'JWT_SECRET')?.envValue).toBeNull()
  })

  it('returns an empty list when no policy service is on the context', () => {
    expect(resolvers.Query.systemConfig(null, null, {} as unknown as Context)).toEqual([])
  })
})

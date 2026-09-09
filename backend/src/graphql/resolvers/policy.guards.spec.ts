// The error and no-actor paths of the three policy mutations, called directly.
//
// Every one of them needs the PolicyService to FAIL, and to fail in a specific way: the resolvers
// translate a PolicyValidationError into a client-facing UserInputError and let everything else
// through untouched. A real service reaches those two outcomes only through inputs the schema
// already rejects (an unknown PolicyKey is not a valid enum value) or through a database fault,
// so the service is stubbed here — the resolvers' own behaviour is what is under test, not the
// service's.
import { describe, it, expect, vi } from 'vitest'

import { PolicyValidationError } from '@src/policy'

import policyResolvers from './policy'

import type { Context } from '@src/context'

const event = { key: 'inviteRegistration', value: true, actor: 'admin-id', timestamp: 'now' }

// Only what the mutations read. `pubsub` is there because a gate-flag key would publish through
// it — none of the keys used below is one, so it is never called.
const contextWith = (policy: Record<string, unknown>, userId: string | null = 'admin-id') =>
  ({
    policy,
    user: userId ? { id: userId } : null,
    pubsub: { publish: vi.fn() },
  }) as unknown as Context

const { setPolicy, resetPolicy, resetPolicies } = policyResolvers.Mutation

// Each entry closes over its OWN argument shape. A shared `args` column would have to satisfy all
// three resolver signatures at once, which no single object does.
const mutations = [
  {
    name: 'setPolicy',
    method: 'set',
    invoke: async (context: Context) =>
      setPolicy(null, { key: 'inviteRegistration', value: 'true' }, context),
  },
  {
    name: 'resetPolicy',
    method: 'reset',
    invoke: async (context: Context) => resetPolicy(null, { key: 'inviteRegistration' }, context),
  },
  {
    name: 'resetPolicies',
    method: 'resetMany',
    invoke: async (context: Context) =>
      resetPolicies(null, { keys: ['inviteRegistration'] }, context),
  },
]

describe.each(mutations)('$name', ({ method, invoke }) => {
  const call = async (policy: Record<string, unknown>, userId: string | null = 'admin-id') =>
    invoke(contextWith(policy, userId))

  // The admin UI shows this message verbatim next to the field. Letting the domain error through
  // as-is would surface it as INTERNAL_SERVER_ERROR with no message at all, and Apollo would log
  // a stack trace for what is a typo in a form.
  it('reports a policy validation failure as client input error', async () => {
    const policy = {
      [method]: vi.fn().mockRejectedValue(new PolicyValidationError('value must be a boolean')),
    }

    await expect(call(policy)).rejects.toThrow('value must be a boolean')
    await expect(call(policy)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    })
  })

  // Anything else — a dropped connection, a write conflict — is NOT the admin's fault and must
  // keep its own identity: translating it too would tell the admin their input was wrong and
  // would hide a real fault from the error reporting.
  it('lets a failure that is not a validation error through unchanged', async () => {
    const failure = new Error('Neo4j connection refused')
    const policy = { [method]: vi.fn().mockRejectedValue(failure) }

    await expect(call(policy)).rejects.toBe(failure)
  })

  // These mutations sit behind an admin permission, so a request always carries a user. The
  // fallback is what keeps the AUDIT TRAIL well-formed if an internal caller (a migration, a
  // seeder) ever changes policy: an event with no actor at all would be indistinguishable from
  // a missing field in the admin's change log.
  it('records "unknown" as the actor when there is no authenticated user', async () => {
    const impl = vi.fn().mockResolvedValue(method === 'resetMany' ? [event] : event)

    await call({ [method]: impl }, null)

    expect(impl.mock.calls[0].at(-1)).toBe('unknown')
  })
})

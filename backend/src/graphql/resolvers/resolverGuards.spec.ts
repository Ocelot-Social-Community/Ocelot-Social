// Second-lock guards that a GraphQL request cannot reach, gathered because they are the same
// assertion in four places and none of them needs a fixture.
//
// Each sits behind a shield rule that already guarantees the condition — `isAuthenticated` for the
// three user guards, the `apiKeysEnabled` gate for the fourth. What they add is a floor under
// INTERNAL callers (a seeder, a migration, a future subscription resolver) and under a shield rule
// that is later loosened or reordered: without them, badge and social-media writes would MERGE an
// edge to `undefined`, and createApiKey would mint a working credential for a network that has the
// feature switched off.
//
// The contexts below are deliberately incomplete — no driver, no database. A resolver that got
// past its guard fails loudly here instead of quietly writing somewhere.
import { describe, it, expect } from 'vitest'

import apiKeysResolvers from './apiKeys'
import badgesResolvers from './badges'
import emailsResolvers from './emails'
import rolesResolvers, { publishPermissionsChanged } from './roles'
import socialMediaResolvers from './socialMedia'

import type { Context } from '@src/context'

const anonymous = () => ({ user: null }) as unknown as Context

describe('resolvers reached without an authenticated user', () => {
  const calls: Record<string, () => Promise<void>> = {
    'badges.setVerificationBadge': async () => {
      await badgesResolvers.Mutation.setVerificationBadge(
        null,
        { badgeId: 'b1', userId: 'u1' },
        anonymous(),
        null,
      )
    },
    'badges.rewardTrophyBadge': async () => {
      await badgesResolvers.Mutation.rewardTrophyBadge(
        null,
        { badgeId: 'b1', userId: 'u1' },
        anonymous(),
        null,
      )
    },
    'socialMedia.CreateSocialMedia': async () => {
      await socialMediaResolvers.Mutation.CreateSocialMedia(
        null,
        { url: 'https://example.org/profile' },
        anonymous(),
        null,
      )
    },
  }

  it.each(Object.entries(calls))('%s refuses to act', async (_name, call) => {
    await expect(call()).rejects.toThrow('Missing authenticated user.')
  })
})

describe('createApiKey while the apiKeysEnabled policy is off', () => {
  // The shield gate refuses the mutation first, so this never fires for a request. It is the
  // resolver's own refusal to mint a credential the network has disabled — the one thing here
  // that would still be usable AFTER the policy was switched off.
  it('refuses to mint a key', async () => {
    const context = { policy: { get: () => false } } as unknown as Context

    await expect(
      apiKeysResolvers.Mutation.createApiKey(null, { name: 'a key' }, context),
    ).rejects.toThrow('API keys are not enabled')
  })
})

// The permissions broadcast is best-effort by design: a role change is already committed by the
// time it runs, so a pubsub that is down must not turn a successful mutation into a failed one.
// publish() is typed `void | Promise<void>`, and the two failure shapes need separate handling —
// the synchronous one is covered by the mutations that use it, the ASYNC one only from here,
// because a real PubSub never rejects.
describe(publishPermissionsChanged, () => {
  it('swallows an asynchronous publish failure', async () => {
    const publish = vi.fn().mockRejectedValue(new Error('redis is gone'))
    const context = { pubsub: { publish } } as unknown as Context

    expect(() => {
      publishPermissionsChanged(context, 'moderator')
    }).not.toThrow()
    // Let the rejected promise settle: an unhandled rejection here would fail the run, which is
    // exactly what the `.catch` prevents in production.
    await new Promise((resolve) => setImmediate(resolve))

    expect(publish).toHaveBeenCalledTimes(1)
  })
})

// Two resolvers that translate ONE domain error into a client-facing one and must leave every
// other failure alone. Both need the service below them to fail, which through the schema only
// happens for inputs the resolver has already rejected itself — so they are driven with a stub.
describe('error translation', () => {
  it('createRole lets a failure that is not a role validation error through unchanged', async () => {
    const failure = new Error('Neo4j connection refused')
    const context = {
      role: { getRole: () => undefined, upsertRole: vi.fn().mockRejectedValue(failure) },
      user: { id: 'admin-id' },
    } as unknown as Context

    await expect(
      rolesResolvers.Mutation.createRole(null, { name: 'curator', permissions: [] }, context),
    ).rejects.toBe(failure)
  })

  it('VerifyEmailAddress reports a transient database failure as itself', async () => {
    // Only the unique-constraint violation means "somebody already has this address". Translating
    // a terminated transaction the same way would tell the user their input was wrong and hide a
    // real fault from the error reporting.
    const failure = Object.assign(new Error('transaction terminated'), {
      code: 'Neo.TransientError.Transaction.Terminated',
    })
    const close = vi.fn()
    const context = {
      user: { id: 'u1' },
      driver: { session: () => ({ writeTransaction: async () => Promise.reject(failure), close }) },
    } as unknown as Context

    await expect(
      emailsResolvers.Mutation.VerifyEmailAddress(
        null,
        { email: 'someone@example.org', nonce: '12345' },
        context,
        null,
      ),
    ).rejects.toBe(failure)
    // The session is closed on the way out either way — a leaked session outlives the request.
    expect(close).toHaveBeenCalledTimes(1)
  })
})

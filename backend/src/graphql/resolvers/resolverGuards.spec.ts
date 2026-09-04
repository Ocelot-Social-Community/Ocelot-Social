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
import socialMediaResolvers from './socialMedia'

import type { Context } from '@src/context'

const anonymous = () => ({ user: null }) as unknown as Context

describe('resolvers reached without an authenticated user', () => {
  const calls = {
    'badges.setVerificationBadge': async () =>
      badgesResolvers.Mutation.setVerificationBadge(
        null,
        { badgeId: 'b1', userId: 'u1' },
        anonymous(),
        null,
      ),
    'badges.rewardTrophyBadge': async () =>
      badgesResolvers.Mutation.rewardTrophyBadge(
        null,
        { badgeId: 'b1', userId: 'u1' },
        anonymous(),
        null,
      ),
    'socialMedia.CreateSocialMedia': async () =>
      socialMediaResolvers.Mutation.CreateSocialMedia(
        null,
        { url: 'https://example.org/profile' },
        anonymous(),
        null,
      ),
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

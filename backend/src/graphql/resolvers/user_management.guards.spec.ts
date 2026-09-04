// Two "no authenticated user" guards that a request can never reach: `currentUser` and
// `changePassword` both sit behind isAuthenticated in the shield, so context.user is guaranteed
// by the time either resolver runs.
//
// They are the second lock, and what they protect differs per resolver: currentUser would query
// `MATCH (user:User { id: undefined })` — a full label scan that matches nothing but costs a round
// trip on every call — while changePassword would go on to hash and WRITE a new password onto
// whatever `MATCH (user:User {id: null})` binds.
import { describe, it, expect } from 'vitest'

import userManagementResolvers from './user_management'

import type { Context } from '@src/context'

// Deliberately carries no database: a resolver that got past its guard must fail loudly here
// rather than quietly querying with an undefined id.
const anonymousContext = () => ({ user: null }) as unknown as Context

describe('user_management resolvers without an authenticated user', () => {
  it('currentUser refuses to look anyone up', async () => {
    await expect(
      userManagementResolvers.Query.currentUser(null, {}, anonymousContext(), null),
    ).rejects.toThrow('You must be logged in')
  })

  it('changePassword refuses to write a password', async () => {
    await expect(
      userManagementResolvers.Mutation.changePassword(
        null,
        { oldPassword: 'old', newPassword: 'new' },
        anonymousContext(),
      ),
    ).rejects.toThrow('Missing authenticated user.')
  })
})

// Every notification handler in this middleware wraps a mutation and reads the RESULT of it:
// `post.id`, `user.id`. Each therefore guards on the resolver having produced something. Through
// the schema those mutations either succeed or throw — the middleware never sees a null — so the
// guards are only reachable from here, and what they prevent is concrete: without them the
// handler would build a notification query keyed on `undefined`, which in Cypher matches nothing
// but is written as a MERGE in several of the notify* helpers.
//
// Called with a stub resolver rather than through the schema, because the point is precisely the
// return value the schema cannot produce.
import { describe, it, expect, vi } from 'vitest'

import notificationsMiddleware from './notificationsMiddleware'

import type { Context } from '@src/context'
import type { GraphQLResolveInfo } from 'graphql'

const contextWithSpy = () => {
  const publish = vi.fn()
  // `driver` is present so a handler that got past its guard would fail on a real session rather
  // than on an undefined property — the assertion below would then name the wrong cause.
  return {
    publish,
    context: { pubsub: { publish }, driver: { session: vi.fn() } } as unknown as Context,
  }
}

// The handlers never look at `info`; typing it away here keeps each call site free of a cast.
const noInfo = null as unknown as GraphQLResolveInfo

describe.each([
  ['JoinGroup', { groupId: 'g1', userId: 'u1' }],
  ['LeaveGroup', { groupId: 'g1', userId: 'u1' }],
  ['ChangeGroupMemberRole', { groupId: 'g1', userId: 'u1', roleInGroup: 'admin' }],
  ['RemoveUserFromGroup', { groupId: 'g1', userId: 'u1' }],
  ['CreatePost', { title: 'A title', content: 'Hello @somebody' }],
  // CreateComment/UpdateComment are deliberately NOT in this table: handleContentDataOfComment is
  // the one handler with no such guard — it reads `comment.id` straight off the result. Adding it
  // here would be asserting behaviour that does not exist (it throws a TypeError instead).
] as const)('%s', (mutation, args) => {
  it('publishes nothing and passes the empty result through', async () => {
    const { publish, context } = contextWithSpy()
    const resolve = vi.fn().mockResolvedValue(null)

    // eslint-disable-next-line security/detect-object-injection -- key from the literal table above
    const handler = notificationsMiddleware.Mutation[mutation]
    const result: unknown = await handler(resolve, null, args, context, noInfo)

    expect(result).toBeNull()
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(publish).not.toHaveBeenCalled()
  })
})

// Middleware branches that a GraphQL request does not produce, driven with a stub resolver.
//
// Each middleware wraps a resolver and then reads its RESULT. What is untested from the schema is
// the shape the schema cannot produce: a mutation that resolved to nothing (every mutation these
// wrap either succeeds or throws), a chat room without a last message, and a mutation that already
// carries an explicit `deleted` argument.
import { describe, it, expect, vi } from 'vitest'

import chatMiddleware from './chatMiddleware'
import hashtagsMiddleware from './hashtags/hashtagsMiddleware'
import softDeleteMiddleware from './softDelete/softDeleteMiddleware'

import type { Context } from '@src/context'
import type { GraphQLResolveInfo } from 'graphql'

const emptyContext = () => ({}) as unknown as Context

// The middlewares under test never look at `info`; typing it away here keeps each call site free
// of a cast that would say nothing.
const noInfo = null as unknown as GraphQLResolveInfo

describe('hashtagsMiddleware', () => {
  // updateHashtagsOfPost keys on `post.id`. Without the guard a mutation that produced nothing
  // would rewrite the hashtag edges of `MATCH (post:Post {id: undefined})` — which matches no
  // post, so the failure would be silent rather than loud.
  it('touches no hashtags when the mutation produced no post', async () => {
    const resolve = vi.fn().mockResolvedValue(null)

    const result: unknown = await hashtagsMiddleware.Mutation.CreatePost(
      resolve,
      null,
      { content: 'a post with a #hashtag' },
      emptyContext(),
      noInfo,
    )

    expect(result).toBeNull()
    expect(resolve).toHaveBeenCalledTimes(1)
  })
})

describe('chatMiddleware', () => {
  // `_id` is the alias the chat front end keys on; every Room and Message it receives must carry
  // one. A room the viewer has opened but never written in has no lastMessage at all — reading
  // `.id` off it unguarded would throw for exactly the rooms a new chat starts as.
  it('adds the _id alias to a room that has no last message yet', async () => {
    const room = { id: 'r1', users: [{ id: 'u1' }], lastMessage: null }
    const resolve = vi.fn().mockResolvedValue([room])

    const [resolved] = (await chatMiddleware.Query.Room(
      resolve,
      null,
      {},
      emptyContext(),
      noInfo,
    )) as [{ users: { _id?: string }[] }]

    expect(resolved.users[0]._id).toBe('u1')
  })

  // Room is nullable in the schema, and the room queries answer `[]` or null for a room the
  // viewer does not chat in. Walking that answer for `_id` aliases would throw on the one code
  // path that is reached by an unauthorised lookup.
  it('passes an empty result through untouched', async () => {
    const resolve = vi.fn().mockResolvedValue(null)

    await expect(
      chatMiddleware.Query.Room(resolve, null, {}, emptyContext(), noInfo),
    ).resolves.toBeNull()
  })
})

describe('softDeleteMiddleware', () => {
  // The mutation default is `deleted = false`, but it must not OVERWRITE a boolean the caller
  // already set — the factories create deleted content on purpose, and forcing false here would
  // silently make every such fixture visible.
  it.each([true, false])('leaves an explicit deleted=%s argument alone', async (deleted) => {
    const resolve = vi.fn().mockResolvedValue(null)

    await softDeleteMiddleware.Mutation(resolve, null, { deleted }, emptyContext(), noInfo)

    expect(resolve.mock.calls[0][1]).toMatchObject({ deleted, disabled: false })
  })

  it('defaults a missing deleted argument to false', async () => {
    const resolve = vi.fn().mockResolvedValue(null)

    await softDeleteMiddleware.Mutation(resolve, null, {}, emptyContext(), noInfo)

    expect(resolve.mock.calls[0][1]).toMatchObject({ deleted: false, disabled: false })
  })
})

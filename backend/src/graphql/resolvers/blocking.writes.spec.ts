import { beforeAll, afterAll, afterEach, beforeEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import CreateComment from '@graphql/queries/comments/CreateComment.gql'
import DeleteComment from '@graphql/queries/comments/DeleteComment.gql'
import UpdateComment from '@graphql/queries/comments/UpdateComment.gql'
import blockUser from '@graphql/queries/interactions/blockUser.gql'
import unblockUser from '@graphql/queries/interactions/unblockUser.gql'
import CreateGroupRoom from '@graphql/queries/messaging/CreateGroupRoom.gql'
import CreateMessage from '@graphql/queries/messaging/CreateMessage.gql'
import Message from '@graphql/queries/messaging/Message.gql'
import CreatePost from '@graphql/queries/posts/CreatePost.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// #10744: a block was kept only by the webapp, which hides the comment form. Through the API a
// blocked user still commented under the post of whoever blocked them, and still wrote to them
// in chat. The block is now refused where the write happens:
//
//   comments  a block either way between the commenter and the post's author ends commenting —
//             writing and editing; deleting one's own comment stays. A block with another
//             commenter does not count, as in the webapp.
//   chat      a block either way ends a direct chat: no new room, no new message in an existing
//             one, the history stays readable. A group room is the group's and is not touched.

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })

let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

interface Viewer {
  toJson: () => Promise<Context['user']>
}
const users = new Map<string, Viewer>()

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

const as = async (name: string) => {
  const user = users.get(name)
  authenticatedUser = user ? await user.toJson() : null
}

const buildUsers = async (...names: string[]) => {
  for (const name of names) {
    // The factory module is untyped; its user is typed here, once, as what these tests use of it.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user: Viewer = await Factory.build(
      'user',
      { id: name, name, slug: name },
      { email: `${name}@example.org`, password: '1234' },
    )
    users.set(name, user)
  }
}

const block = async (blocker: string, blocked: string) => {
  await as(blocker)
  const result = await mutate({ mutation: blockUser, variables: { id: blocked } })

  expect(result.errors).toBeUndefined()
}

const count = async (cypher: string, params: Record<string, unknown> = {}): Promise<number> => {
  const session = database.driver.session()
  try {
    const result = await session.readTransaction((transaction) => transaction.run(cypher, params))
    return (result.records[0].get('count') as { toNumber: () => number }).toNumber()
  } finally {
    await session.close()
  }
}

const errorCodeOf = (result: { errors?: readonly { extensions?: Record<string, unknown> }[] }) =>
  result.errors?.[0]?.extensions?.errorCode

// Both directions, because the webapp treats them alike: whoever set the block, it ends contact.
const DIRECTIONS = [
  { name: 'the author blocked the commenter', blocker: 'author', blocked: 'commenter' },
  { name: 'the commenter blocked the author', blocker: 'commenter', blocked: 'author' },
]

describe('comments under a post', () => {
  beforeEach(async () => {
    await buildUsers('author', 'commenter', 'bystander')
    await as('author')
    await mutate({
      mutation: CreatePost,
      variables: { id: 'post', title: 'A post', content: 'Its content' },
    })
    await as('commenter')
    await mutate({
      mutation: CreateComment,
      variables: { id: 'before-block', postId: 'post', content: 'Written before the block' },
    })
  })

  afterEach(async () => {
    users.clear()
    await cleanDatabase()
  })

  describe.each(DIRECTIONS)('when $name', ({ blocker, blocked }) => {
    beforeEach(async () => {
      await block(blocker, blocked)
      await as('commenter')
    })

    it('refuses a new comment, and writes none', async () => {
      const result = await mutate({
        mutation: CreateComment,
        variables: { id: 'after-block', postId: 'post', content: 'Written after the block' },
      })

      expect(errorCodeOf(result)).toBe('COMMENT_SAVE_BLOCKED')
      await expect(
        count("MATCH (c:Comment { id: 'after-block' }) RETURN count(c) AS count"),
      ).resolves.toBe(0)
    })

    it('refuses to edit a comment written before the block, and keeps its content', async () => {
      const result = await mutate({
        mutation: UpdateComment,
        variables: { id: 'before-block', content: 'Rewritten after the block' },
      })

      expect(errorCodeOf(result)).toBe('COMMENT_SAVE_BLOCKED')
      await expect(
        count(
          "MATCH (c:Comment { id: 'before-block', content: 'Written before the block' }) RETURN count(c) AS count",
        ),
      ).resolves.toBe(1)
    })

    it('still lets the commenter delete their comment', async () => {
      const result = await mutate({ mutation: DeleteComment, variables: { id: 'before-block' } })

      expect(result).toMatchObject({
        errors: undefined,
        data: { DeleteComment: { id: 'before-block', deleted: true } },
      })
    })

    it('lets the commenter comment again once the block is lifted', async () => {
      await as(blocker)
      await mutate({ mutation: unblockUser, variables: { id: blocked } })
      await as('commenter')
      const result = await mutate({
        mutation: CreateComment,
        variables: { id: 'after-unblock', postId: 'post', content: 'Written after the unblock' },
      })

      expect(result).toMatchObject({
        errors: undefined,
        data: { CreateComment: { id: 'after-unblock' } },
      })
    })
  })

  it('does not count a block with another commenter', async () => {
    await as('bystander')
    await mutate({
      mutation: CreateComment,
      variables: { id: 'by-bystander', postId: 'post', content: 'A third voice' },
    })
    await block('bystander', 'commenter')
    await as('commenter')
    const result = await mutate({
      mutation: CreateComment,
      variables: { id: 'after-block', postId: 'post', content: 'Still allowed' },
    })

    expect(result).toMatchObject({
      errors: undefined,
      data: { CreateComment: { id: 'after-block' } },
    })
  })
})

describe('direct chat', () => {
  const directRooms = async () =>
    count(
      `MATCH (:User { id: 'author' })-[:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(:User { id: 'commenter' })
       WHERE NOT (room)-[:ROOM_FOR]->()
       RETURN count(room) AS count`,
    )

  beforeEach(async () => {
    await buildUsers('author', 'commenter')
  })

  afterEach(async () => {
    users.clear()
    await cleanDatabase()
  })

  describe.each(DIRECTIONS)('when $name', ({ blocker, blocked }) => {
    it('opens no direct room between the two, for either of them', async () => {
      await block(blocker, blocked)
      for (const [from, to] of [
        ['author', 'commenter'],
        ['commenter', 'author'],
      ]) {
        await as(from)
        const result = await mutate({
          mutation: CreateMessage,
          variables: { userId: to, content: 'Hello' },
        })

        expect(errorCodeOf(result)).toBe('CHAT_DIRECT_ROOM_BLOCKED')
      }

      await expect(directRooms()).resolves.toBe(0)
    })

    describe('in a direct room that existed before', () => {
      let roomId: string

      beforeEach(async () => {
        await as('author')
        const result = await mutate({
          mutation: CreateMessage,
          variables: { userId: 'commenter', content: 'Before the block' },
        })
        roomId = (result.data as { CreateMessage: { room: { id: string } } }).CreateMessage.room.id
        await block(blocker, blocked)
      })

      it('takes no new message from either of them', async () => {
        for (const sender of ['author', 'commenter']) {
          await as(sender)
          const byRoom = await mutate({
            mutation: CreateMessage,
            variables: { roomId, content: 'After the block' },
          })
          const byUser = await mutate({
            mutation: CreateMessage,
            variables: {
              userId: sender === 'author' ? 'commenter' : 'author',
              content: 'After the block',
            },
          })

          expect(errorCodeOf(byRoom)).toBe('CHAT_DIRECT_ROOM_BLOCKED')
          expect(errorCodeOf(byUser)).toBe('CHAT_DIRECT_ROOM_BLOCKED')
        }

        await expect(
          count("MATCH (m:Message { content: 'After the block' }) RETURN count(m) AS count"),
        ).resolves.toBe(0)
      })

      it('keeps what was written readable', async () => {
        await as('commenter')
        const result = await query({ query: Message, variables: { roomId } })

        expect(result).toMatchObject({
          errors: undefined,
          data: { Message: [expect.objectContaining({ content: 'Before the block' })] },
        })
      })
    })
  })
})

describe('group chat', () => {
  beforeEach(async () => {
    await buildUsers('author', 'commenter')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- untyped factory, see buildUsers
    await Factory.build('group', { id: 'group', name: 'A group' }, { owner: users.get('author') })
    const session = database.driver.session()
    try {
      await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (u:User { id: 'commenter' }), (g:Group { id: 'group' })
           MERGE (u)-[m:MEMBER_OF]->(g) SET m.role = 'usual', m.createdAt = toString(datetime())`,
        ),
      )
    } finally {
      await session.close()
    }
  })

  afterEach(async () => {
    users.clear()
    await cleanDatabase()
  })

  it('still takes messages from both members when one blocks the other', async () => {
    await as('author')
    const room = await mutate({ mutation: CreateGroupRoom, variables: { groupId: 'group' } })
    const roomId = (room.data as { CreateGroupRoom: { id: string } }).CreateGroupRoom.id
    await block('author', 'commenter')

    for (const sender of ['author', 'commenter']) {
      await as(sender)
      const result = await mutate({
        mutation: CreateMessage,
        variables: { roomId, content: `From ${sender}` },
      })

      expect(result).toMatchObject({
        errors: undefined,
        data: { CreateMessage: { content: `From ${sender}` } },
      })
    }
  })
})

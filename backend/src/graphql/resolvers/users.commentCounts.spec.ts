/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'
import { expect, beforeAll, afterAll, describe, it } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import DeleteUser from '@graphql/queries/users/DeleteUser.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// Two numbers about a user's comments, answering different questions (#8557):
//
//   * commentedCount — how many posts they commented on. It labels the profile's "commented"
//     tab, so it has to count exactly what that tab lists.
//   * commentsCount — how many comments they wrote. It is what deleting the account with its
//     comments deletes, so it counts everything that deletion reaches, including comments the
//     viewer may not see — which is why only the user and user administrators may read it.
//
// The commenter's comments:
//   on `cc-public`        two, plus one disabled by a moderator
//   on `cc-only-deleted`  one, which they deleted
//   on `cc-disabled`      one; the post was disabled by a moderator
//   on `cc-closed`        one; the post is in a closed group the stranger is not part of

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

const users = new Map<string, Context['user']>()

const asUser = (name: string) => {
  authenticatedUser = users.get(name) ?? null
}

const countsQuery = parse(`
  query ($id: ID!) {
    User(id: $id) {
      commentedCount
      commentsCount
    }
  }
`)

const commentedCountQuery = parse(`
  query ($id: ID!) {
    User(id: $id) {
      commentedCount
    }
  }
`)

const commentedTabQuery = parse(`
  query ($filter: _PostFilter) {
    profilePagePosts(filter: $filter) { id }
  }
`)

const countsOf = async (id: string) => {
  const { data, errors } = await setup.query({ query: countsQuery, variables: { id } })

  expect(errors).toBeUndefined()

  const [user] = data?.User as { commentedCount: number; commentsCount: number }[]
  return user
}

const commentedCountOf = async (id: string) => {
  const { data, errors } = await setup.query({ query: commentedCountQuery, variables: { id } })

  expect(errors).toBeUndefined()

  const [user] = data?.User as { commentedCount: number }[]
  return user.commentedCount
}

const commentedTabOf = async (id: string) => {
  const { data, errors } = await setup.query({
    query: commentedTabQuery,
    variables: { filter: { comments_some: { author: { id } } } },
  })

  expect(errors).toBeUndefined()

  return (data?.profilePagePosts as { id: string }[]).map((post) => post.id).sort()
}

const undeletedCommentIdsOf = async (id: string) => {
  const result = await setup.database.query({
    query: `
      MATCH (:User { id: $id })-[:WROTE]->(comment:Comment)
      WHERE coalesce(comment.deleted, false) = false
      RETURN comment.id AS id
    `,
    variables: { id },
  })
  return result.records.map((record) => record.get('id') as string).sort()
}

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }) })

  const [commenter, poster, stranger, moderator, admin] = await Promise.all([
    Factory.build('user', { id: 'cc-commenter' }),
    Factory.build('user', { id: 'cc-poster' }),
    Factory.build('user', { id: 'cc-stranger' }),
    Factory.build('user', { id: 'cc-moderator', role: 'moderator' }),
    Factory.build('user', { id: 'cc-admin', role: 'admin' }),
  ])
  const viewers = { commenter, stranger, moderator, admin }
  for (const [name, built] of Object.entries(viewers)) {
    const user: Context['user'] = await built.toJson()
    users.set(name, user)
  }

  await Factory.build('group', { id: 'cc-group', template: 'closed' }, { owner: poster })
  await Promise.all([
    Factory.build('post', { id: 'cc-public' }, { author: poster }),
    Factory.build('post', { id: 'cc-only-deleted' }, { author: poster }),
    Factory.build('post', { id: 'cc-disabled' }, { author: poster }),
    Factory.build('post', { id: 'cc-closed' }, { author: poster }),
  ])
  // A moderator disabled one post; another is in the closed group, which the commenter joined
  // to be able to comment there.
  await setup.database.write({
    query: `
      MATCH (disabled:Post { id: 'cc-disabled' }), (closed:Post { id: 'cc-closed' })
      MATCH (group:Group { id: 'cc-group' }), (commenter:User { id: 'cc-commenter' })
      SET disabled.disabled = true
      MERGE (closed)-[:IN]->(group)
      MERGE (commenter)-[membership:MEMBER_OF]->(group)
      SET membership.role = 'usual', membership.createdAt = toString(datetime())
    `,
  })

  const comment = async (postId: string, attributes = {}) => {
    await Factory.build('comment', attributes, { postId, author: commenter })
  }
  await Promise.all([
    comment('cc-public', { id: 'cc-comment-1' }),
    comment('cc-public', { id: 'cc-comment-2' }),
    comment('cc-public', { id: 'cc-comment-disabled', disabled: true }),
    comment('cc-only-deleted', { id: 'cc-comment-deleted', deleted: true }),
    comment('cc-disabled', { id: 'cc-comment-on-disabled' }),
    comment('cc-closed', { id: 'cc-comment-in-group' }),
    comment('cc-public', { id: 'cc-comment-legacy' }),
  ])
  // `deleted` is optional on Comment, so older data may lack it — such a comment is not deleted.
  await setup.database.write({
    query: `MATCH (comment:Comment { id: 'cc-comment-legacy' }) REMOVE comment.deleted`,
  })
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('User.commentedCount', () => {
  it('counts the posts the "commented" tab lists, not the comments', async () => {
    asUser('stranger')

    // Four comments on cc-public are one post; a post whose only comment by the user was
    // deleted still appears in the tab, so it counts too.
    await expect(commentedTabOf('cc-commenter')).resolves.toEqual(['cc-only-deleted', 'cc-public'])
    await expect(commentedCountOf('cc-commenter')).resolves.toBe(2)
  })

  it('counts the post in the closed group for a viewer the tab shows it to', async () => {
    asUser('commenter')

    await expect(commentedTabOf('cc-commenter')).resolves.toEqual([
      'cc-closed',
      'cc-only-deleted',
      'cc-public',
    ])
    await expect(commentedCountOf('cc-commenter')).resolves.toBe(3)
  })
})

describe('User.commentsCount', () => {
  it('counts every comment the user has not deleted, wherever it is', async () => {
    asUser('commenter')

    // The two on cc-public, the one lacking `deleted`, the disabled one, the one on the
    // disabled post and the one in the closed group — but not the deleted one.
    await expect(countsOf('cc-commenter')).resolves.toMatchObject({ commentsCount: 6 })
  })

  it.each([['admin'], ['moderator']])(
    'is readable by the %s administering accounts',
    async (viewer) => {
      asUser(viewer)

      await expect(countsOf('cc-commenter')).resolves.toMatchObject({ commentsCount: 6 })
    },
  )

  it('is refused to anybody else, since it counts comments they may not see', async () => {
    asUser('stranger')

    const { errors } = await setup.query({
      query: countsQuery,
      variables: { id: 'cc-commenter' },
    })

    expect(errors).toEqual([expect.objectContaining({ message: 'Not Authorized!' })])
  })

  it('is exactly what deleting the account with its comments deletes', async () => {
    asUser('commenter')
    const { commentsCount } = await countsOf('cc-commenter')
    const before = await undeletedCommentIdsOf('cc-commenter')

    expect(before).toHaveLength(commentsCount)

    const { errors } = await setup.mutate({
      mutation: DeleteUser,
      variables: { id: 'cc-commenter', resource: ['Comment'] },
    })

    expect(errors).toBeUndefined()
    await expect(undeletedCommentIdsOf('cc-commenter')).resolves.toEqual([])
  })
})

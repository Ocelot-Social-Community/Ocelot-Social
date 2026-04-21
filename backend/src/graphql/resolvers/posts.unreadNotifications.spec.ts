/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import postWithUnreadNotifications from '@graphql/queries/posts/PostUnreadNotifications.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let user
let author
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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

beforeEach(async () => {
  authenticatedUser = null
})

afterEach(async () => {
  await cleanDatabase()
})

describe('Post.unreadNotificationByCurrentUser / unreadCommentNotificationsByCurrentUser', () => {
  beforeEach(async () => {
    author = await Factory.build('user', { id: 'author' })
    user = await Factory.build('user', { id: 'you' })
    const neighbor = await Factory.build('user', { id: 'neighbor' })
    await Factory.build('category', { id: 'cat1' })

    // Target post with a post-level unread notification for `user`
    const targetPost = await Factory.build(
      'post',
      { id: 'p-target', content: 'Mentioned you' },
      { author, categoryIds: ['cat1'] },
    )
    // Unrelated post with notification for a different user — must not leak
    const unrelatedPost = await Factory.build(
      'post',
      { id: 'p-unrelated', content: 'For neighbor' },
      { author, categoryIds: ['cat1'] },
    )
    const commentUnread = await Factory.build(
      'comment',
      { id: 'c-unread', content: 'Unread comment mention' },
      { author, postId: 'p-target' },
    )
    const commentRead = await Factory.build(
      'comment',
      { id: 'c-read', content: 'Already read comment mention' },
      { author, postId: 'p-target' },
    )
    const commentForNeighbor = await Factory.build(
      'comment',
      { id: 'c-neighbor', content: 'Comment notif for neighbor' },
      { author, postId: 'p-target' },
    )

    await targetPost.relateTo(user, 'notified', {
      createdAt: '2026-01-01T00:00:00.000Z',
      read: false,
      reason: 'mentioned_in_post',
    })
    await unrelatedPost.relateTo(neighbor, 'notified', {
      createdAt: '2026-01-02T00:00:00.000Z',
      read: false,
      reason: 'mentioned_in_post',
    })
    await commentUnread.relateTo(user, 'notified', {
      createdAt: '2026-01-03T00:00:00.000Z',
      read: false,
      reason: 'mentioned_in_comment',
    })
    await commentRead.relateTo(user, 'notified', {
      createdAt: '2026-01-04T00:00:00.000Z',
      read: true,
      reason: 'mentioned_in_comment',
    })
    await commentForNeighbor.relateTo(neighbor, 'notified', {
      createdAt: '2026-01-05T00:00:00.000Z',
      read: false,
      reason: 'mentioned_in_comment',
    })
  })

  describe('unauthenticated', () => {
    it('returns null / empty notification fields (Post query itself is public)', async () => {
      const response = await query({
        query: postWithUnreadNotifications,
        variables: { id: 'p-target' },
      })
      expect(response.errors).toBeUndefined()
      const post = response.data?.Post[0]
      expect(post.unreadNotificationByCurrentUser).toBeNull()
      expect(post.unreadCommentNotificationsByCurrentUser).toEqual([])
    })
  })

  describe('authenticated as target user', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('returns the unread post-level notification', async () => {
      const response = await query({
        query: postWithUnreadNotifications,
        variables: { id: 'p-target' },
      })
      expect(response.errors).toBeUndefined()
      expect(response.data?.Post[0].unreadNotificationByCurrentUser).toMatchObject({
        read: false,
        reason: 'mentioned_in_post',
        from: { __typename: 'Post', id: 'p-target' },
      })
    })

    it('returns only the unread comment notification, not the already-read one', async () => {
      const response = await query({
        query: postWithUnreadNotifications,
        variables: { id: 'p-target' },
      })
      expect(response.errors).toBeUndefined()
      const list = response.data?.Post[0].unreadCommentNotificationsByCurrentUser
      expect(list).toHaveLength(1)
      expect(list[0]).toMatchObject({
        read: false,
        reason: 'mentioned_in_comment',
        from: { __typename: 'Comment', id: 'c-unread' },
      })
    })

    it('does not leak notifications that target other users', async () => {
      const response = await query({
        query: postWithUnreadNotifications,
        variables: { id: 'p-target' },
      })
      const list = response.data?.Post[0].unreadCommentNotificationsByCurrentUser
      expect(list.map((n) => n.from.id)).not.toContain('c-neighbor')
    })
  })

  describe('authenticated as unrelated user', () => {
    beforeEach(async () => {
      authenticatedUser = await (await Factory.build('user', { id: 'stranger' })).toJson()
    })

    it('returns null for the post-level notification', async () => {
      const response = await query({
        query: postWithUnreadNotifications,
        variables: { id: 'p-target' },
      })
      expect(response.errors).toBeUndefined()
      expect(response.data?.Post[0].unreadNotificationByCurrentUser).toBeNull()
    })

    it('returns an empty list for comment notifications', async () => {
      const response = await query({
        query: postWithUnreadNotifications,
        variables: { id: 'p-target' },
      })
      expect(response.data?.Post[0].unreadCommentNotificationsByCurrentUser).toEqual([])
    })
  })
})

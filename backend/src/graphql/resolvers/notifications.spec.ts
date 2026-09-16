/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
import { PubSub } from 'graphql-subscriptions'
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import { NOTIFICATION_ADDED } from '@constants/subscriptions'
import Factory, { cleanDatabase } from '@db/factories'
import markAllAsRead from '@graphql/queries/notifications/markAllAsRead.gql'
import markAsRead from '@graphql/queries/notifications/markAsRead.gql'
import markAsUnread from '@graphql/queries/notifications/markAsUnread.gql'
import notifications from '@graphql/queries/notifications/notifications.gql'
import notificationsPaginated from '@graphql/queries/notifications/notificationsPaginated.gql'
import DeletePost from '@graphql/queries/posts/DeletePost.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import notificationsResolvers from './notifications'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let user
let author
let variables
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  query = apolloSetup.query
  mutate = apolloSetup.mutate
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
  variables = { orderBy: 'createdAt_asc' }
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('given some notifications', () => {
  beforeEach(async () => {
    const categoryIds = ['cat1']
    author = await Factory.build('user', { id: 'author' })
    user = await Factory.build('user', { id: 'you' })
    const [neighbor] = await Promise.all([
      Factory.build('user', { id: 'neighbor' }),
      Factory.build('category', { id: 'cat1' }),
    ])
    const post1 = await Factory.build(
      'post',
      { id: 'p1', content: 'Not for you' },
      { author, categoryIds },
    )
    const post2 = await Factory.build(
      'post',
      {
        id: 'p2',
        content: 'Already seen post mention',
      },
      {
        author,
        categoryIds,
      },
    )
    const post3 = await Factory.build(
      'post',
      {
        id: 'p3',
        content: 'You have been mentioned in a post',
      },
      {
        author,
        categoryIds,
      },
    )
    const comment1 = await Factory.build(
      'comment',
      {
        id: 'c1',
        content: 'You have seen this comment mentioning already',
      },
      {
        author,
        postId: 'p3',
      },
    )
    const comment2 = await Factory.build(
      'comment',
      {
        id: 'c2',
        content: 'You have been mentioned in a comment',
      },
      {
        author,
        postId: 'p3',
      },
    )
    const comment3 = await Factory.build(
      'comment',
      {
        id: 'c3',
        content: 'Somebody else was mentioned in a comment',
      },
      {
        author,
        postId: 'p3',
      },
    )

    await post1.relateTo(neighbor, 'notified', {
      createdAt: '2019-08-29T17:33:48.651Z',
      read: false,
      reason: 'mentioned_in_post',
    })
    await post2.relateTo(user, 'notified', {
      createdAt: '2019-08-30T17:33:48.651Z',
      read: true,
      reason: 'mentioned_in_post',
    })
    await post3.relateTo(user, 'notified', {
      createdAt: '2019-08-31T17:33:48.651Z',
      read: false,
      reason: 'mentioned_in_post',
    })
    await comment1.relateTo(user, 'notified', {
      createdAt: '2019-08-30T15:33:48.651Z',
      read: true,
      reason: 'mentioned_in_comment',
    })
    await comment2.relateTo(user, 'notified', {
      createdAt: '2019-08-30T19:33:48.651Z',
      read: false,
      reason: 'mentioned_in_comment',
    })
    await comment3.relateTo(neighbor, 'notified', {
      createdAt: '2019-09-01T17:33:48.651Z',
      read: false,
      reason: 'mentioned_in_comment',
    })
  })

  describe('notifications', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const { errors } = await query({ query: notifications })

        expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        authenticatedUser = await user.toJson()
      })

      describe('no filters', () => {
        it('returns all notifications of current user', async () => {
          await expect(query({ query: notifications, variables })).resolves.toMatchObject({
            data: {
              notifications: expect.arrayContaining([
                expect.objectContaining({
                  from: {
                    __typename: 'Comment',
                    content: 'You have seen this comment mentioning already',
                    id: 'c1',
                  },
                  read: true,
                  createdAt: '2019-08-30T15:33:48.651Z',
                }),
                expect.objectContaining({
                  from: {
                    __typename: 'Post',
                    content: 'Already seen post mention',
                    id: 'p2',
                  },
                  read: true,
                  createdAt: '2019-08-30T17:33:48.651Z',
                }),
                expect.objectContaining({
                  from: {
                    __typename: 'Comment',
                    content: 'You have been mentioned in a comment',
                    id: 'c2',
                  },
                  read: false,
                  createdAt: '2019-08-30T19:33:48.651Z',
                }),
                expect.objectContaining({
                  from: {
                    __typename: 'Post',
                    content: 'You have been mentioned in a post',
                    id: 'p3',
                  },
                  read: false,
                  createdAt: '2019-08-31T17:33:48.651Z',
                }),
              ]),
            },
            errors: undefined,
          })
        })
      })

      describe('filter for read: false', () => {
        it('returns only unread notifications of current user', async () => {
          const response = await query({
            query: notifications,
            variables: { ...variables, read: false },
          })

          await expect(response).toMatchObject({
            data: {
              notifications: expect.arrayContaining([
                expect.objectContaining({
                  from: {
                    __typename: 'Comment',
                    content: 'You have been mentioned in a comment',
                    id: 'c2',
                  },
                  read: false,
                  createdAt: '2019-08-30T19:33:48.651Z',
                }),
                expect.objectContaining({
                  from: {
                    __typename: 'Post',
                    content: 'You have been mentioned in a post',
                    id: 'p3',
                  },
                  read: false,
                  createdAt: '2019-08-31T17:33:48.651Z',
                }),
              ]),
            },
          })
          await expect(response.data?.notifications).toHaveLength(2) // double-check
        })

        describe('if a resource gets deleted', () => {
          const deletePostAction = async () => {
            authenticatedUser = await author.toJson()

            await expect(
              mutate({ mutation: DeletePost, variables: { id: 'p3' } }),
            ).resolves.toMatchObject({
              data: { DeletePost: { id: 'p3', deleted: true } },
              errors: undefined,
            })

            authenticatedUser = await user.toJson()
          }

          it('reduces notifications list', async () => {
            await expect(
              query({ query: notifications, variables: { ...variables, read: false } }),
            ).resolves.toMatchObject({
              data: { notifications: [expect.any(Object), expect.any(Object)] },
              errors: undefined,
            })

            await deletePostAction()

            await expect(
              query({ query: notifications, variables: { ...variables, read: false } }),
            ).resolves.toMatchObject({ data: { notifications: [] }, errors: undefined })
          })
        })
      })

      describe('filter for read: true', () => {
        it('returns only already-read notifications', async () => {
          const response = await query({
            query: notifications,
            variables: { ...variables, read: true },
          })

          expect(response.errors).toBeUndefined()
          expect(response.data?.notifications).toHaveLength(2)
          expect(response.data?.notifications.every((n) => n.read === true)).toBe(true)
        })
      })

      describe('orderBy updatedAt_asc / updatedAt_desc', () => {
        // The fixtures don't set notification.updatedAt, so we can't assert a stable
        // ordering — just exercise the ORDER BY branch and verify the query succeeds.
        it('accepts updatedAt_asc and returns the full set', async () => {
          const response = await query({
            query: notifications,
            variables: { orderBy: 'updatedAt_asc' },
          })

          expect(response.errors).toBeUndefined()
          expect(response.data?.notifications).toHaveLength(4)
        })

        it('accepts updatedAt_desc and returns the full set', async () => {
          const response = await query({
            query: notifications,
            variables: { orderBy: 'updatedAt_desc' },
          })

          expect(response.errors).toBeUndefined()
          expect(response.data?.notifications).toHaveLength(4)
        })
      })

      describe('pagination with first/offset', () => {
        it('applies LIMIT when first is set', async () => {
          const response = await query({
            query: notificationsPaginated,
            variables: { first: 1 },
          })

          expect(response.errors).toBeUndefined()
          expect(response.data?.notifications).toHaveLength(1)
        })

        it('applies SKIP when offset is set', async () => {
          const withoutOffset = await query({
            query: notificationsPaginated,
            variables: {},
          })
          const withOffset = await query({
            query: notificationsPaginated,
            variables: { offset: 1 },
          })

          expect(withOffset.data?.notifications).toHaveLength(
            withoutOffset.data.notifications.length - 1,
          )
        })
      })
    })
  })

  describe('markAsRead', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const result = await mutate({
          mutation: markAsRead,
          variables: { ...variables, id: 'p1' },
        })

        expect(result.errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        authenticatedUser = await user.toJson()
      })

      describe('not being notified at all', () => {
        beforeEach(async () => {
          variables = {
            ...variables,
            id: 'p1',
          }
        })

        it('returns null', async () => {
          const response = await mutate({ mutation: markAsRead, variables })

          expect(response.data?.markAsRead).toEqual(null)
          expect(response.errors).toBeUndefined()
        })
      })

      describe('being notified', () => {
        describe('on a post', () => {
          beforeEach(async () => {
            variables = {
              ...variables,
              id: 'p3',
            }
          })

          it('updates `read` attribute and returns NOTIFIED relationship', async () => {
            const { data } = await mutate({ mutation: markAsRead, variables })

            expect(data).toEqual({
              markAsRead: {
                id: expect.any(String),
                from: {
                  __typename: 'Post',
                  id: 'p3',
                  content: 'You have been mentioned in a post',
                },
                read: true,
                createdAt: '2019-08-31T17:33:48.651Z',
              },
            })
          })

          describe('but notification was already marked as read', () => {
            beforeEach(async () => {
              variables = {
                ...variables,
                id: 'p2',
              }
            })

            it('returns null', async () => {
              const response = await mutate({ mutation: markAsRead, variables })

              expect(response.data?.markAsRead).toEqual(null)
              expect(response.errors).toBeUndefined()
            })
          })
        })

        describe('on a comment', () => {
          beforeEach(async () => {
            variables = {
              ...variables,
              id: 'c2',
            }
          })

          it('updates `read` attribute and returns NOTIFIED relationship', async () => {
            const { data } = await mutate({ mutation: markAsRead, variables })

            expect(data).toEqual({
              markAsRead: {
                id: expect.any(String),
                from: {
                  __typename: 'Comment',
                  id: 'c2',
                  content: 'You have been mentioned in a comment',
                },
                read: true,
                createdAt: '2019-08-30T19:33:48.651Z',
              },
            })
          })
        })
      })
    })
  })

  describe('markAsUnread', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const result = await mutate({
          mutation: markAsUnread,
          variables: { id: 'p2' },
        })

        expect(result.errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        authenticatedUser = await user.toJson()
      })

      describe('not being notified at all', () => {
        it('returns null', async () => {
          const response = await mutate({
            mutation: markAsUnread,
            variables: { id: 'p1' },
          })

          expect(response.data?.markAsUnread).toEqual(null)
          expect(response.errors).toBeUndefined()
        })
      })

      describe('being notified with read=true', () => {
        it('flips `read` to false and returns NOTIFIED relationship', async () => {
          const { data } = await mutate({
            mutation: markAsUnread,
            variables: { id: 'p2' },
          })

          expect(data).toEqual({
            markAsUnread: {
              id: expect.any(String),
              from: {
                __typename: 'Post',
                id: 'p2',
                content: 'Already seen post mention',
              },
              read: false,
              createdAt: '2019-08-30T17:33:48.651Z',
            },
          })
        })
      })

      describe('notification already unread', () => {
        it('returns null (no-op)', async () => {
          const response = await mutate({
            mutation: markAsUnread,
            variables: { id: 'p3' },
          })

          expect(response.data?.markAsUnread).toEqual(null)
          expect(response.errors).toBeUndefined()
        })
      })

      describe('being notified on a comment', () => {
        it('flips `read` to false on a comment notification', async () => {
          const { data } = await mutate({
            mutation: markAsUnread,
            variables: { id: 'c1' },
          })

          expect(data).toEqual({
            markAsUnread: {
              id: expect.any(String),
              from: {
                __typename: 'Comment',
                id: 'c1',
                content: 'You have seen this comment mentioning already',
              },
              read: false,
              createdAt: '2019-08-30T15:33:48.651Z',
            },
          })
        })
      })
    })
  })

  describe('markAllAsRead', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const result = await mutate({
          mutation: markAllAsRead,
        })

        expect(result.errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        authenticatedUser = await user.toJson()
      })

      describe('not being notified at all', () => {
        beforeEach(async () => {
          variables = {
            ...variables,
          }
        })

        it('returns all as read', async () => {
          const response = await mutate({ mutation: markAllAsRead, variables })

          expect(response.data?.markAllAsRead).toEqual(
            expect.arrayContaining([
              {
                createdAt: '2019-08-30T19:33:48.651Z',
                from: {
                  __typename: 'Comment',
                  id: 'c2',
                  content: 'You have been mentioned in a comment',
                },
                id: 'mentioned_in_comment/c2/you',
                read: true,
              },
              {
                createdAt: '2019-08-31T17:33:48.651Z',
                from: {
                  __typename: 'Post',
                  id: 'p3',
                  content: 'You have been mentioned in a post',
                },
                id: 'mentioned_in_post/p3/you',
                read: true,
              },
            ]),
          )
          expect(response.errors).toBeUndefined()
        })
      })
    })
  })
})

// A notification carries the title, the author and the group of its resource — the bell renders
// all three. Listing one for a post the recipient may not open therefore publishes exactly what
// the group's visibility exists to withhold, and offers a dead link on top: every post query DOES
// apply the rule, so following the notification lands on nothing.
//
// The edges below are the ones a bug produced on a live instance (a group filter that fell open
// on UpdatePost, fixed in notificationsMiddleware). They are written by hand rather than through
// the mutation for that reason: this describes what the read path does with such an edge no
// matter how it got there, which is the half that has to hold when the next writer gets it wrong.
describe('given a notification about a post the recipient may not see', () => {
  const invisibleTo = async (userId: string, postId: string) => {
    const session = database.driver.session()
    try {
      await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (user:User { id: $userId }), (post:Post { id: $postId })
           MERGE (user)-[:CANNOT_SEE]->(post)`,
          { userId, postId },
        ),
      )
    } finally {
      await session.close()
    }
  }

  beforeEach(async () => {
    author = await Factory.build('user', { id: 'author' })
    user = await Factory.build('user', { id: 'you' })
    await Factory.build('category', { id: 'cat1' })
    const post = await Factory.build(
      'post',
      { id: 'secret-post', content: 'Inside a group you are not in' },
      { author, categoryIds: ['cat1'] },
    )
    const comment = await Factory.build(
      'comment',
      { id: 'secret-comment', content: 'A comment on it' },
      { author, postId: 'secret-post' },
    )
    await post.relateTo(user, 'notified', {
      createdAt: '2026-09-16T10:00:00.000Z',
      read: false,
      reason: 'followed_user_posted',
    })
    await comment.relateTo(user, 'notified', {
      createdAt: '2026-09-16T10:01:00.000Z',
      read: false,
      reason: 'commented_on_post',
    })
    await invisibleTo('you', 'secret-post')
    authenticatedUser = await user.toJson()
  })

  it('does not list the notification about the post', async () => {
    await expect(query({ query: notifications, variables })).resolves.toMatchObject({
      data: { notifications: [] },
      errors: undefined,
    })
  })

  it('does not list the notification about a COMMENT on that post either', async () => {
    // CANNOT_SEE points at posts. A comment has no such edge of its own and is exactly as
    // unreachable as the post carrying it, so the filter has to reach through `:COMMENTS`.
    // Covered by the assertion above only as long as both notifications exist — hence its own
    // test, which fails loudly if the comment slips through while the post does not.
    const { data } = await query({ query: notifications, variables })

    expect(data?.notifications).not.toContainEqual(
      expect.objectContaining({ from: expect.objectContaining({ id: 'secret-comment' }) }),
    )
  })

  it('still lists it for someone who may see the post', async () => {
    // The filter is per recipient, not per post: the same notification must survive for a
    // reader without the edge. Without this, a filter that dropped everything would pass.
    const neighbor = await Factory.build('user', { id: 'neighbor' })
    const session = database.driver.session()
    try {
      await session.writeTransaction((transaction) =>
        transaction.run(
          `MATCH (post:Post { id: 'secret-post' }), (user:User { id: 'neighbor' })
           MERGE (post)-[notification:NOTIFIED { reason: 'followed_user_posted' }]->(user)
           SET notification.read = FALSE,
               notification.createdAt = '2026-09-16T10:00:00.000Z',
               notification.updatedAt = '2026-09-16T10:00:00.000Z'`,
        ),
      )
    } finally {
      await session.close()
    }
    authenticatedUser = await neighbor.toJson()

    await expect(query({ query: notifications, variables })).resolves.toMatchObject({
      data: {
        notifications: [
          expect.objectContaining({ from: expect.objectContaining({ id: 'secret-post' }) }),
        ],
      },
      errors: undefined,
    })
  })

  it('keeps filtering when the query asks for unread only', async () => {
    // The read filter used to be its own WHERE clause and is now an AND on this one. A mistake
    // there would make `read: false` — the variables the bell itself sends — skip the visibility
    // condition entirely, which is the one call that matters.
    await expect(
      query({ query: notifications, variables: { ...variables, read: false } }),
    ).resolves.toMatchObject({
      data: { notifications: [] },
      errors: undefined,
    })
  })
})

// A notification is addressed to exactly one person, and the channel is shared by everyone with an
// open socket. The filter is what keeps the two apart — without it, every connected client would
// receive every notification in the network, including the content of posts and comments they
// cannot see. Driven through a real PubSub because the channel name and the filter only fail
// together: a subscription attached to the wrong constant simply never fires, silently.
describe('Subscription.notificationAdded', () => {
  it('delivers only the notifications addressed to the subscriber', async () => {
    const pubsub = new PubSub()
    const iterator = notificationsResolvers.Subscription.notificationAdded.subscribe(
      null,
      {},
      { user: { id: 'me' }, pubsub },
      null,
    )
    const delivered = iterator.next()

    await pubsub.publish(NOTIFICATION_ADDED, {
      notificationAdded: { id: 'n-other', to: { id: 'somebody-else' } },
    })
    await pubsub.publish(NOTIFICATION_ADDED, {
      notificationAdded: { id: 'n-mine', to: { id: 'me' } },
    })

    expect((await delivered).value).toMatchObject({ notificationAdded: { id: 'n-mine' } })

    await iterator.return?.()
  })
})

import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { getDriver } from '../../db/neo4j'
import { createTestClient } from 'apollo-server-testing'
import createServer from '../.././server'
import {
  markAsReadMutation,
  markAllAsReadMutation,
  notificationQuery,
} from '../../graphql/notifications'

const driver = getDriver()
let authenticatedUser
let user
let author
let variables
let query
let mutate

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        user: authenticatedUser,
      }
    },
  })
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
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
        const { errors } = await query({ query: notificationQuery() })
        expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        authenticatedUser = await user.toJson()
      })

      describe('no filters', () => {
        it('returns all notifications of current user', async () => {
          const expected = [
            {
              from: {
                __typename: 'Comment',
                content: 'You have seen this comment mentioning already',
              },
              read: true,
              createdAt: '2019-08-30T15:33:48.651Z',
            },
            {
              from: {
                __typename: 'Post',
                content: 'Already seen post mention',
              },
              read: true,
              createdAt: '2019-08-30T17:33:48.651Z',
            },
            {
              from: {
                __typename: 'Comment',
                content: 'You have been mentioned in a comment',
              },
              read: false,
              createdAt: '2019-08-30T19:33:48.651Z',
            },
            {
              from: {
                __typename: 'Post',
                content: 'You have been mentioned in a post',
              },
              read: false,
              createdAt: '2019-08-31T17:33:48.651Z',
            },
          ]

          await expect(query({ query: notificationQuery(), variables })).resolves.toMatchObject({
            data: {
              notifications: expect.arrayContaining(expected),
            },
            errors: undefined,
          })
        })
      })

      describe('filter for read: false', () => {
        it('returns only unread notifications of current user', async () => {
          const expected = expect.objectContaining({
            data: {
              notifications: expect.arrayContaining([
                {
                  from: {
                    __typename: 'Comment',
                    content: 'You have been mentioned in a comment',
                  },
                  read: false,
                  createdAt: '2019-08-30T19:33:48.651Z',
                },
                {
                  from: {
                    __typename: 'Post',
                    content: 'You have been mentioned in a post',
                  },
                  read: false,
                  createdAt: '2019-08-31T17:33:48.651Z',
                },
              ]),
            },
          })
          const response = await query({
            query: notificationQuery(),
            variables: { ...variables, read: false },
          })
          await expect(response).toMatchObject(expected)
          await expect(response.data.notifications).toHaveLength(2) // double-check
        })

        describe('if a resource gets deleted', () => {
          const deletePostAction = async () => {
            authenticatedUser = await author.toJson()
            const deletePostMutation = gql`
              mutation ($id: ID!) {
                DeletePost(id: $id) {
                  id
                  deleted
                }
              }
            `
            await expect(
              mutate({ mutation: deletePostMutation, variables: { id: 'p3' } }),
            ).resolves.toMatchObject({
              data: { DeletePost: { id: 'p3', deleted: true } },
              errors: undefined,
            })
            authenticatedUser = await user.toJson()
          }

          it('reduces notifications list', async () => {
            await expect(
              query({ query: notificationQuery(), variables: { ...variables, read: false } }),
            ).resolves.toMatchObject({
              data: { notifications: [expect.any(Object), expect.any(Object)] },
              errors: undefined,
            })
            await deletePostAction()
            await expect(
              query({ query: notificationQuery(), variables: { ...variables, read: false } }),
            ).resolves.toMatchObject({ data: { notifications: [] }, errors: undefined })
          })
        })
      })
    })
  })

  describe('markAsRead', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const result = await mutate({
          mutation: markAsReadMutation(),
          variables: { ...variables, id: 'p1' },
        })
        expect(result.errors[0]).toHaveProperty('message', 'Not Authorized!')
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
          const response = await mutate({ mutation: markAsReadMutation(), variables })
          expect(response.data.markAsRead).toEqual(null)
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
            const { data } = await mutate({ mutation: markAsReadMutation(), variables })
            expect(data).toEqual({
              markAsRead: {
                from: {
                  __typename: 'Post',
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
              const response = await mutate({ mutation: markAsReadMutation(), variables })
              expect(response.data.markAsRead).toEqual(null)
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
            const { data } = await mutate({ mutation: markAsReadMutation(), variables })
            expect(data).toEqual({
              markAsRead: {
                from: {
                  __typename: 'Comment',
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

  describe('markAllAsRead', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const result = await mutate({
          mutation: markAllAsReadMutation(),
        })
        expect(result.errors[0]).toHaveProperty('message', 'Not Authorized!')
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
          const response = await mutate({ mutation: markAllAsReadMutation(), variables })
          expect(response.data.markAllAsRead).toEqual(
            expect.arrayContaining([
              {
                createdAt: '2019-08-30T19:33:48.651Z',
                from: { __typename: 'Comment', content: 'You have been mentioned in a comment' },
                read: true,
              },
              {
                createdAt: '2019-08-31T17:33:48.651Z',
                from: { __typename: 'Post', content: 'You have been mentioned in a post' },
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

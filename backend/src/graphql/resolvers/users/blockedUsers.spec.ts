/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { cleanDatabase } from '@db/factories'
import { blockedUsers } from '@graphql/queries/blockedUsers'
import { blockUser } from '@graphql/queries/blockUser'
import { Post } from '@graphql/queries/Post'
import { unblockUser } from '@graphql/queries/unblockUser'
import { User } from '@graphql/queries/User'
import { createApolloTestSetup } from '@root/test/helpers'
import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let currentUser
let blockedUser

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
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

afterEach(async () => {
  await cleanDatabase()
})

describe('blockedUsers', () => {
  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(query({ query: blockedUsers })).resolves.toMatchObject({
        data: { blockedUsers: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated and given a blocked user', () => {
    beforeEach(async () => {
      currentUser = await database.neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      blockedUser = await database.neode.create('User', {
        name: 'Blocked User',
        id: 'u2',
      })
      await currentUser.relateTo(blockedUser, 'blocked')
      authenticatedUser = await currentUser.toJson()
    })

    it('returns a list of blocked users', async () => {
      await expect(query({ query: blockedUsers })).resolves.toMatchObject({
        data: {
          blockedUsers: [
            {
              name: 'Blocked User',
              id: 'u2',
              isBlocked: true,
            },
          ],
        },
      })
    })
  })
})

describe('blockUser', () => {
  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(mutate({ mutation: blockUser, variables: { id: 'u2' } })).resolves.toMatchObject(
        {
          data: { blockUser: null },
          errors: [{ message: 'Not Authorized!' }],
        },
      )
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      currentUser = await database.neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      authenticatedUser = await currentUser.toJson()
    })

    describe('block yourself', () => {
      it('returns null', async () => {
        await expect(
          mutate({ mutation: blockUser, variables: { id: 'u1' } }),
        ).resolves.toMatchObject({
          data: { blockUser: null },
        })
      })
    })

    describe('block not existing user', () => {
      it('throws an error', async () => {
        await expect(
          mutate({ mutation: blockUser, variables: { id: 'u2' } }),
        ).resolves.toMatchObject({
          errors: [
            {
              message: 'Could not find User',
            },
          ],
        })
      })
    })

    describe('given a to-be-blocked user', () => {
      beforeEach(async () => {
        blockedUser = await database.neode.create('User', {
          name: 'Blocked User',
          id: 'u2',
        })
      })

      it('blocks a user', async () => {
        await expect(
          mutate({ mutation: blockUser, variables: { id: 'u2' } }),
        ).resolves.toMatchObject({
          data: {
            blockUser: { id: 'u2', name: 'Blocked User', isBlocked: true },
          },
        })
      })

      it('unfollows the user when blocking', async () => {
        await currentUser.relateTo(blockedUser, 'following')
        await expect(query({ query: User, variables: { id: 'u2' } })).resolves.toMatchObject({
          data: { User: [{ id: 'u2', isBlocked: false, followedByCurrentUser: true }] },
        })
        await mutate({ mutation: blockUser, variables: { id: 'u2' } })
        await expect(query({ query: User, variables: { id: 'u2' } })).resolves.toMatchObject({
          data: { User: [{ id: 'u2', isBlocked: true, followedByCurrentUser: false }] },
        })
      })

      describe('given both the current user and the to-be-blocked user write a post', () => {
        beforeEach(async () => {
          const post1 = await database.neode.create('Post', {
            id: 'p12',
            title: 'A post written by the current user',
          })
          const post2 = await database.neode.create('Post', {
            id: 'p23',
            title: 'A post written by the blocked user',
          })
          await Promise.all([
            post1.relateTo(currentUser, 'author'),
            post2.relateTo(blockedUser, 'author'),
          ])
        })

        const bothPostsAreInTheNewsfeed = async () => {
          await expect(
            query({ query: Post, variables: { orderBy: 'createdAt_asc' } }),
          ).resolves.toMatchObject({
            data: {
              Post: [
                {
                  id: 'p12',
                  title: 'A post written by the current user',
                  author: {
                    name: 'Current User',
                    id: 'u1',
                  },
                },
                {
                  id: 'p23',
                  title: 'A post written by the blocked user',
                  author: {
                    name: 'Blocked User',
                    id: 'u2',
                  },
                },
              ],
            },
          })
        }

        describe('from the perspective of the current user', () => {
          it('both posts are in the newsfeed', bothPostsAreInTheNewsfeed)

          describe('but if the current user blocks the other user', () => {
            beforeEach(async () => {
              await currentUser.relateTo(blockedUser, 'blocked')
            })

            // TODO: clarify proper behaviour
            it("the blocked user's post still shows up in the newsfeed of the current user", async () => {
              await expect(
                query({ query: Post, variables: { orderBy: 'createdAt_asc' } }),
              ).resolves.toMatchObject({
                data: {
                  Post: [
                    {
                      id: 'p12',
                      title: 'A post written by the current user',
                      author: {
                        name: 'Current User',
                        id: 'u1',
                      },
                    },
                    {
                      id: 'p23',
                      title: 'A post written by the blocked user',
                      author: {
                        name: 'Blocked User',
                        id: 'u2',
                      },
                    },
                  ],
                },
              })
            })
          })
        })

        describe('from the perspective of the blocked user', () => {
          beforeEach(async () => {
            authenticatedUser = await blockedUser.toJson()
          })

          it('both posts are in the newsfeed', bothPostsAreInTheNewsfeed)
          describe('but if the current user blocks the other user', () => {
            beforeEach(async () => {
              await currentUser.relateTo(blockedUser, 'blocked')
            })

            it("the current user's post will show up in the newsfeed of the blocked user", async () => {
              await expect(
                query({ query: Post, variables: { orderBy: 'createdAt_asc' } }),
              ).resolves.toMatchObject({
                data: {
                  Post: expect.arrayContaining([
                    {
                      id: 'p23',
                      title: 'A post written by the blocked user',
                      author: { name: 'Blocked User', id: 'u2' },
                    },
                    {
                      id: 'p12',
                      title: 'A post written by the current user',
                      author: { name: 'Current User', id: 'u1' },
                    },
                  ]),
                },
              })
            })
          })
        })
      })
    })
  })
})

describe('unblockUser', () => {
  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: unblockUser, variables: { id: 'u2' } }),
      ).resolves.toMatchObject({
        data: { unblockUser: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      currentUser = await database.neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      authenticatedUser = await currentUser.toJson()
    })

    describe('unblock yourself', () => {
      it('returns null', async () => {
        await expect(
          mutate({ mutation: unblockUser, variables: { id: 'u1' } }),
        ).resolves.toMatchObject({
          data: { unblockUser: null },
        })
      })
    })

    describe('unblock not-existing user', () => {
      it('throws an error', async () => {
        await expect(
          mutate({ mutation: unblockUser, variables: { id: 'lksjdflksfdj' } }),
        ).resolves.toMatchObject({
          errors: [
            {
              message: 'Could not find blocked User',
            },
          ],
        })
      })
    })

    describe('given another user', () => {
      beforeEach(async () => {
        blockedUser = await database.neode.create('User', {
          name: 'Blocked User',
          id: 'u2',
        })
      })

      describe('unblocking a not yet blocked user', () => {
        it('throws an error', async () => {
          await expect(
            mutate({ mutation: unblockUser, variables: { id: 'u2' } }),
          ).resolves.toMatchObject({
            errors: [
              {
                message: 'Could not find blocked User',
              },
            ],
          })
        })
      })

      describe('given a blocked user', () => {
        beforeEach(async () => {
          await currentUser.relateTo(blockedUser, 'blocked')
        })

        it('unblocks a user', async () => {
          await expect(
            mutate({ mutation: unblockUser, variables: { id: 'u2' } }),
          ).resolves.toMatchObject({
            data: {
              unblockUser: { id: 'u2', name: 'Blocked User', isBlocked: false },
            },
          })
        })

        describe('unblocking twice', () => {
          it('throws an error on second unblock', async () => {
            await mutate({ mutation: unblockUser, variables: { id: 'u2' } })
            await expect(
              mutate({ mutation: unblockUser, variables: { id: 'u2' } }),
            ).resolves.toMatchObject({
              errors: [
                {
                  message: 'Could not find blocked User',
                },
              ],
            })
          })
        })
      })
    })
  })
})

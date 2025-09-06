/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import gql from 'graphql-tag'

import { cleanDatabase } from '@db/factories'
import { blockedUsers } from '@graphql/queries/blockedUsers'
import { blockUser } from '@graphql/queries/blockUser'
import { unblockUser } from '@graphql/queries/unblockUser'
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

beforeEach(() => {
  authenticatedUser = null
})

afterEach(async () => {
  await cleanDatabase()
})

describe('blockedUsers', () => {
  it('throws permission error', async () => {
    const result = await query({ query: blockedUsers })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
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
      await expect(query({ query: blockedUsers })).resolves.toEqual(
        expect.objectContaining({
          data: {
            blockedUsers: [
              {
                name: 'Blocked User',
                id: 'u2',
                isBlocked: true,
              },
            ],
          },
        }),
      )
    })
  })
})

describe('blockUser', () => {
  const blockAction = (variables) => {
    return mutate({ mutation: blockUser, variables })
  }

  beforeEach(() => {
    currentUser = undefined
  })

  describe('unauthenticated', () => {
    it('throws permission error', async () => {
      await expect(blockAction({ id: 'u2' })).resolves.toEqual(
        expect.objectContaining({
          errors: [
            expect.objectContaining({
              message: 'Not Authorized!',
            }),
          ],
        }),
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
        await expect(blockAction({ id: 'u1' })).resolves.toEqual(
          expect.objectContaining({ data: { blockUser: null } }),
        )
      })
    })

    describe('block not existing user', () => {
      it('throws an error', async () => {
        await expect(blockAction({ id: 'u2' })).resolves.toEqual(
          expect.objectContaining({
            errors: [
              expect.objectContaining({
                message: 'Could not find User',
              }),
            ],
          }),
        )
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
        await expect(blockAction({ id: 'u2' })).resolves.toEqual(
          expect.objectContaining({
            data: {
              blockUser: { id: 'u2', name: 'Blocked User', isBlocked: true },
            },
          }),
        )
      })

      it('unfollows the user when blocking', async () => {
        await currentUser.relateTo(blockedUser, 'following')
        const queryUser = gql`
          query {
            User(id: "u2") {
              id
              isBlocked
              followedByCurrentUser
            }
          }
        `
        await expect(query({ query: queryUser })).resolves.toEqual(
          expect.objectContaining({
            data: { User: [{ id: 'u2', isBlocked: false, followedByCurrentUser: true }] },
          }),
        )
        await blockAction({ id: 'u2' })
        await expect(query({ query: queryUser })).resolves.toEqual(
          expect.objectContaining({
            data: { User: [{ id: 'u2', isBlocked: true, followedByCurrentUser: false }] },
          }),
        )
      })

      describe('given both the current user and the to-be-blocked user write a post', () => {
        let postQuery

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
          postQuery = gql`
            query {
              Post(orderBy: createdAt_asc) {
                id
                title
                author {
                  id
                  name
                }
              }
            }
          `
        })

        const bothPostsAreInTheNewsfeed = async () => {
          await expect(query({ query: postQuery })).resolves.toEqual(
            expect.objectContaining({
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
            }),
          )
        }

        describe('from the perspective of the current user', () => {
          it('both posts are in the newsfeed', bothPostsAreInTheNewsfeed)

          describe('but if the current user blocks the other user', () => {
            beforeEach(async () => {
              await currentUser.relateTo(blockedUser, 'blocked')
            })

            // TODO: clarify proper behaviour
            it("the blocked user's post still shows up in the newsfeed of the current user", async () => {
              await expect(query({ query: postQuery })).resolves.toEqual(
                expect.objectContaining({
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
                }),
              )
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
              await expect(query({ query: postQuery })).resolves.toEqual(
                expect.objectContaining({
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
                }),
              )
            })
          })
        })
      })
    })
  })
})

describe('unblockUser', () => {
  const unblockAction = (variables) => {
    return mutate({ mutation: unblockUser, variables })
  }

  beforeEach(() => {
    currentUser = undefined
  })

  it('throws permission error', async () => {
    await expect(unblockAction({ id: 'u2' })).resolves.toEqual(
      expect.objectContaining({
        errors: [
          expect.objectContaining({
            message: 'Not Authorized!',
          }),
        ],
      }),
    )
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
        await expect(unblockAction({ id: 'u1' })).resolves.toEqual(
          expect.objectContaining({ data: { unblockUser: null } }),
        )
      })
    })

    describe('unblock not-existing user', () => {
      it('throws an error', async () => {
        await expect(unblockAction({ id: 'lksjdflksfdj' })).resolves.toEqual(
          expect.objectContaining({
            errors: [
              expect.objectContaining({
                message: 'Could not find blocked User',
              }),
            ],
          }),
        )
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
          await expect(unblockAction({ id: 'u2' })).resolves.toEqual(
            expect.objectContaining({
              errors: [
                expect.objectContaining({
                  message: 'Could not find blocked User',
                }),
              ],
            }),
          )
        })
      })

      describe('given a blocked user', () => {
        beforeEach(async () => {
          await currentUser.relateTo(blockedUser, 'blocked')
        })

        it('unblocks a user', async () => {
          await expect(unblockAction({ id: 'u2' })).resolves.toEqual(
            expect.objectContaining({
              data: {
                unblockUser: { id: 'u2', name: 'Blocked User', isBlocked: false },
              },
            }),
          )
        })

        describe('unblocking twice', () => {
          it('throws an error on second unblock', async () => {
            await unblockAction({ id: 'u2' })
            await expect(unblockAction({ id: 'u2' })).resolves.toEqual(
              expect.objectContaining({
                errors: [
                  expect.objectContaining({
                    message: 'Could not find blocked User',
                  }),
                ],
              }),
            )
          })
        })
      })
    })
  })
})

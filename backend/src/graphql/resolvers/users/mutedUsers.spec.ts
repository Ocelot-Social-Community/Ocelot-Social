/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { createTestClient } from 'apollo-server-testing'

import { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import { mutedUsers } from '@graphql/queries/mutedUsers'
import { muteUser } from '@graphql/queries/muteUser'
import { Post } from '@graphql/queries/Post'
import { unmuteUser } from '@graphql/queries/unmuteUser'
import { User } from '@graphql/queries/User'
import createServer from '@src/server'

const driver = getDriver()
const neode = getNeode()

let currentUser
let mutedUser
let authenticatedUser
let server

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

beforeEach(() => {
  authenticatedUser = undefined
  ;({ server } = createServer({
    context: () => {
      return {
        user: authenticatedUser,
        driver,
        neode,
        cypherParams: {
          currentUserId: authenticatedUser ? authenticatedUser.id : null,
        },
      }
    },
  }))
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('mutedUsers', () => {
  it('throws permission error', async () => {
    const { query } = createTestClient(server)
    const result = await query({ query: mutedUsers })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
  })

  describe('authenticated and given a muted user', () => {
    beforeEach(async () => {
      currentUser = await neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      mutedUser = await neode.create('User', {
        name: 'Muted User',
        id: 'u2',
      })
      await currentUser.relateTo(mutedUser, 'muted')
      authenticatedUser = await currentUser.toJson()
    })

    it('returns a list of muted users', async () => {
      const { query } = createTestClient(server)
      await expect(query({ query: mutedUsers })).resolves.toEqual(
        expect.objectContaining({
          data: {
            mutedUsers: [
              {
                name: 'Muted User',
                id: 'u2',
                isMuted: true,
              },
            ],
          },
        }),
      )
    })
  })
})

describe('muteUser', () => {
  let muteAction

  beforeEach(() => {
    currentUser = undefined
    muteAction = (variables) => {
      const { mutate } = createTestClient(server)
      return mutate({ mutation: muteUser, variables })
    }
  })

  it('throws permission error', async () => {
    const result = await muteAction({ id: 'u2' })
    expect(result.errors[0]).toHaveProperty('message', 'Not Authorized!')
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      currentUser = await neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      authenticatedUser = await currentUser.toJson()
    })

    describe('mute yourself', () => {
      it('returns null', async () => {
        await expect(muteAction({ id: 'u1' })).resolves.toEqual(
          expect.objectContaining({ data: { muteUser: null } }),
        )
      })
    })

    describe('mute not existing user', () => {
      it('returns null', async () => {
        await expect(muteAction({ id: 'u2' })).resolves.toEqual(
          expect.objectContaining({ data: { muteUser: null } }),
        )
      })
    })

    describe('given a to-be-muted user', () => {
      beforeEach(async () => {
        mutedUser = await neode.create('User', {
          name: 'Muted User',
          id: 'u2',
        })
      })

      it('mutes a user', async () => {
        await expect(muteAction({ id: 'u2' })).resolves.toEqual(
          expect.objectContaining({
            data: {
              muteUser: { id: 'u2', name: 'Muted User', isMuted: true },
            },
          }),
        )
      })

      it('unfollows the user', async () => {
        await currentUser.relateTo(mutedUser, 'following')
        const { query } = createTestClient(server)
        await expect(query({ query: User, variables: { id: 'u2' } })).resolves.toMatchObject({
          data: {
            User: expect.arrayContaining([
              expect.objectContaining({ id: 'u2', isMuted: false, followedByCurrentUser: true }),
            ]),
          },
        })
        await muteAction({ id: 'u2' })
        await expect(query({ query: User, variables: { id: 'u2' } })).resolves.toMatchObject({
          data: {
            User: expect.arrayContaining([
              expect.objectContaining({ id: 'u2', isMuted: true, followedByCurrentUser: false }),
            ]),
          },
        })
      })

      describe('given both the current user and the to-be-muted user write a post', () => {
        beforeEach(async () => {
          const post1 = await neode.create('Post', {
            id: 'p12',
            title: 'A post written by the current user',
            content: 'content',
          })
          const post2 = await neode.create('Post', {
            id: 'p23',
            title: 'A post written by the muted user',
            content: 'content',
          })
          await Promise.all([
            post1.relateTo(currentUser, 'author'),
            post2.relateTo(mutedUser, 'author'),
          ])
        })

        const bothPostsAreInTheNewsfeed = async () => {
          const { query } = createTestClient(server)
          await expect(
            query({ query: Post, variables: { orderBy: 'createdAt_asc' } }),
          ).resolves.toMatchObject({
            data: {
              Post: expect.arrayContaining([
                expect.objectContaining({
                  id: 'p12',
                  title: 'A post written by the current user',
                  author: {
                    name: 'Current User',
                    id: 'u1',
                  },
                }),
                expect.objectContaining({
                  id: 'p23',
                  title: 'A post written by the muted user',
                  author: {
                    name: 'Muted User',
                    id: 'u2',
                  },
                }),
              ]),
            },
          })
        }

        describe('from the perspective of the current user', () => {
          it('both posts are in the newsfeed', bothPostsAreInTheNewsfeed)

          describe('but if the current user mutes the other user', () => {
            beforeEach(async () => {
              await currentUser.relateTo(mutedUser, 'muted')
            })

            it("the muted user's post won't show up in the newsfeed of the current user", async () => {
              const { query } = createTestClient(server)
              await expect(
                query({ query: Post, variables: { orderBy: 'createdAt_asc' } }),
              ).resolves.toMatchObject({
                data: {
                  Post: [
                    expect.objectContaining({
                      id: 'p12',
                      title: 'A post written by the current user',
                      author: { name: 'Current User', id: 'u1' },
                    }),
                  ],
                },
              })
            })

            it("the muted user's post is still accessible by direct id lookup", async () => {
              const { query } = createTestClient(server)
              await expect(query({ query: Post, variables: { id: 'p23' } })).resolves.toMatchObject(
                {
                  data: {
                    Post: [
                      expect.objectContaining({
                        id: 'p23',
                        title: 'A post written by the muted user',
                      }),
                    ],
                  },
                },
              )
            })

            describe('but the muted user has a pinned post', () => {
              beforeEach(async () => {
                const pinnedPost = await neode.create('Post', {
                  id: 'p-pinned',
                  title: 'A pinned post by the muted user',
                  content: 'pinned content',
                  pinned: true,
                })
                await pinnedPost.relateTo(mutedUser, 'author')
              })

              it('the pinned post still shows up in the post list', async () => {
                const { query } = createTestClient(server)
                await expect(
                  query({ query: Post, variables: { orderBy: 'createdAt_asc' } }),
                ).resolves.toMatchObject({
                  data: {
                    Post: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'p-pinned',
                        title: 'A pinned post by the muted user',
                        pinned: true,
                      }),
                    ]),
                  },
                })
              })

              it('the pinned post is accessible by id', async () => {
                const { query } = createTestClient(server)
                await expect(
                  query({ query: Post, variables: { id: 'p-pinned' } }),
                ).resolves.toMatchObject({
                  data: {
                    Post: [
                      expect.objectContaining({
                        id: 'p-pinned',
                        title: 'A pinned post by the muted user',
                        pinned: true,
                      }),
                    ],
                  },
                })
              })

              it('the non-pinned post from the muted user is still hidden in the feed', async () => {
                const { query } = createTestClient(server)
                const result = await query({
                  query: Post,
                  variables: { orderBy: 'createdAt_asc' },
                })
                const postIds = result.data?.Post.map((p) => p.id)
                expect(postIds).not.toContain('p23')
              })
            })
          })
        })

        describe('from the perspective of the muted user', () => {
          beforeEach(async () => {
            authenticatedUser = await mutedUser.toJson()
          })

          it('both posts are in the newsfeed', bothPostsAreInTheNewsfeed)
          describe('but if the current user mutes the other user', () => {
            beforeEach(async () => {
              await currentUser.relateTo(mutedUser, 'muted')
            })

            it("the current user's post will show up in the newsfeed of the muted user", async () => {
              const { query } = createTestClient(server)
              await expect(
                query({ query: Post, variables: { orderBy: 'createdAt_asc' } }),
              ).resolves.toMatchObject({
                data: {
                  Post: expect.arrayContaining([
                    expect.objectContaining({
                      id: 'p23',
                      title: 'A post written by the muted user',
                      author: { name: 'Muted User', id: 'u2' },
                    }),
                    expect.objectContaining({
                      id: 'p12',
                      title: 'A post written by the current user',
                      author: { name: 'Current User', id: 'u1' },
                    }),
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

describe('unmuteUser', () => {
  let unmuteAction

  beforeEach(() => {
    currentUser = undefined
    unmuteAction = (variables) => {
      const { mutate } = createTestClient(server)
      return mutate({ mutation: unmuteUser, variables })
    }
  })

  it('throws permission error', async () => {
    const result = await unmuteAction({ id: 'u2' })
    expect(result.errors[0]).toHaveProperty('message', 'Not Authorized!')
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      currentUser = await neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      authenticatedUser = await currentUser.toJson()
    })

    describe('unmute yourself', () => {
      it('returns null', async () => {
        await expect(unmuteAction({ id: 'u1' })).resolves.toEqual(
          expect.objectContaining({ data: { unmuteUser: null } }),
        )
      })
    })

    describe('unmute not-existing user', () => {
      it('returns null', async () => {
        await expect(unmuteAction({ id: 'lksjdflksfdj' })).resolves.toEqual(
          expect.objectContaining({ data: { unmuteUser: null } }),
        )
      })
    })

    describe('given another user', () => {
      beforeEach(async () => {
        mutedUser = await neode.create('User', {
          name: 'Muted User',
          id: 'u2',
        })
      })

      describe('unmuting a not yet muted user', () => {
        it('does not hurt', async () => {
          await expect(unmuteAction({ id: 'u2' })).resolves.toEqual(
            expect.objectContaining({
              data: {
                unmuteUser: { id: 'u2', name: 'Muted User', isMuted: false },
              },
            }),
          )
        })
      })

      describe('given a muted user', () => {
        beforeEach(async () => {
          await currentUser.relateTo(mutedUser, 'muted')
        })

        it('unmutes a user', async () => {
          await expect(unmuteAction({ id: 'u2' })).resolves.toEqual(
            expect.objectContaining({
              data: {
                unmuteUser: { id: 'u2', name: 'Muted User', isMuted: false },
              },
            }),
          )
        })

        describe('unmuting twice', () => {
          it('has no effect', async () => {
            await unmuteAction({ id: 'u2' })
            await expect(unmuteAction({ id: 'u2' })).resolves.toEqual(
              expect.objectContaining({
                data: {
                  unmuteUser: {
                    id: 'u2',
                    name: 'Muted User',
                    isMuted: false,
                  },
                },
              }),
            )
          })
        })
      })
    })
  })
})

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Factory, { cleanDatabase } from '@db/factories'
import { ChangeGroupMemberRole } from '@graphql/queries/ChangeGroupMemberRole'
import { CreateGroup } from '@graphql/queries/CreateGroup'
import { CreatePost } from '@graphql/queries/CreatePost'
import { pinGroupPost } from '@graphql/queries/pinGroupPost'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

const defaultConfig = {
  CATEGORIES_ACTIVE: false,
}
let config: Partial<Context['config']>

let anyUser
let allGroupsUser
let pendingUser
let publicUser
let publicAdminUser
let closedUser
let hiddenUser
let newUser
let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, config })
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

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(async () => {
  config = { ...defaultConfig }
  authenticatedUser = null

  anyUser = await Factory.build('user', {
    id: 'any-user',
    name: 'Any User',
    about: 'I am just an ordinary user and do not belong to any group.',
  })

  allGroupsUser = await Factory.build('user', {
    id: 'all-groups-user',
    name: 'All Groups User',
    about: 'I am a member of all groups.',
  })
  pendingUser = await Factory.build('user', {
    id: 'pending-user',
    name: 'Pending User',
    about: 'I am a pending member of all groups.',
  })
  publicUser = await Factory.build('user', {
    id: 'public-user',
    name: 'Public User',
    about: 'I am the owner of the public group.',
  })
  publicAdminUser = await Factory.build('user', {
    id: 'public-admin-user',
    name: 'Public Admin User',
    about: 'I am the admin of the public group.',
  })

  closedUser = await Factory.build('user', {
    id: 'closed-user',
    name: 'Private User',
    about: 'I am the owner of the closed group.',
  })

  hiddenUser = await Factory.build('user', {
    id: 'hidden-user',
    name: 'Secret User',
    about: 'I am the owner of the hidden group.',
  })

  authenticatedUser = await publicUser.toJson()
  await mutate({
    mutation: CreateGroup,
    variables: {
      id: 'public-group',
      name: 'The Public Group',
      about: 'The public group!',
      description: 'Anyone can see the posts of this group.',
      groupType: 'public',
      actionRadius: 'regional',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'public-group',
      userId: 'pending-user',
      roleInGroup: 'pending',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'public-group',
      userId: 'all-groups-user',
      roleInGroup: 'usual',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'public-group',
      userId: 'public-admin-user',
      roleInGroup: 'admin',
    },
  })
  authenticatedUser = await closedUser.toJson()
  await mutate({
    mutation: CreateGroup,
    variables: {
      id: 'closed-group',
      name: 'The Closed Group',
      about: 'The closed group!',
      description: 'Only members of this group can see the posts of this group.',
      groupType: 'closed',
      actionRadius: 'regional',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'closed-group',
      userId: 'pending-user',
      roleInGroup: 'pending',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'closed-group',
      userId: 'all-groups-user',
      roleInGroup: 'usual',
    },
  })
  authenticatedUser = await hiddenUser.toJson()
  await mutate({
    mutation: CreateGroup,
    variables: {
      id: 'hidden-group',
      name: 'The Hidden Group',
      about: 'The hidden group!',
      description: 'Only members of this group can see the posts of this group.',
      groupType: 'hidden',
      actionRadius: 'regional',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'hidden-group',
      userId: 'pending-user',
      roleInGroup: 'pending',
    },
  })
  await mutate({
    mutation: ChangeGroupMemberRole,
    variables: {
      groupId: 'hidden-group',
      userId: 'all-groups-user',
      roleInGroup: 'usual',
    },
  })
  authenticatedUser = await anyUser.toJson()
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-without-group',
      title: 'A post without a group',
      content: 'I am a user who does not belong to a group yet.',
    },
  })
  authenticatedUser = await publicUser.toJson()
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-1-to-public-group',
      title: 'Post 1 to a public group',
      content: 'I am posting into a public group as a member of the group',
      groupId: 'public-group',
    },
  })
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-2-to-public-group',
      title: 'Post 1 to a public group',
      content: 'I am posting into a public group as a member of the group',
      groupId: 'public-group',
    },
  })
  await mutate({
    mutation: CreatePost,
    variables: {
      id: 'post-3-to-public-group',
      title: 'Post 1 to a public group',
      content: 'I am posting into a public group as a member of the group',
      groupId: 'public-group',
    },
  })
})

afterEach(async () => {
  await cleanDatabase()
})

describe('pin groupPosts', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      await expect(
        mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
      ).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinGroupPost: null },
      })
    })

    describe('ordinary users', () => {
      it('throws authorization error', async () => {
        authenticatedUser = await anyUser.toJson()
        await expect(
          mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
          data: { pinGroupPost: null },
        })
      })
    })

    describe('group usual', () => {
      it('throws authorization error', async () => {
        authenticatedUser = await allGroupsUser.toJson()
        await expect(
          mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
          data: { pinGroupPost: null },
        })
      })
    })

    describe('group admin', () => {
      it('resolves without error', async () => {
        authenticatedUser = await publicAdminUser.toJson()
        await expect(
          mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
        ).resolves.toMatchObject({
          errors: undefined,
          data: { pinGroupPost: { id: 'post-1-to-public-group' } },
        })
      })
    })

    describe('group owner', () => {
      it('resolves without error', async () => {
        authenticatedUser = await publicUser.toJson()
        await expect(
          mutate({ mutation: pinGroupPost, variables: { id: 'post-1-to-public-group' } }),
        ).resolves.toMatchObject({
          errors: undefined,
          data: { pinGroupPost: { id: 'post-1-to-public-group' } },
        })
      })
    })

    /* describe('group owner', () => {
    let moderator
    beforeEach(async () => {
      moderator = await user.update({ role: 'moderator', updatedAt: new Date().toISOString() })
      authenticatedUser = await moderator.toJson()
    })

    it('throws authorization error', async () => {
      await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
        data: { pinPost: null },
      })
    })
  })

  describe('admins', () => {
    let admin
    beforeEach(async () => {
      admin = await user.update({
        role: 'admin',
        name: 'Admin',
        updatedAt: new Date().toISOString(),
      })
      authenticatedUser = await admin.toJson()
    })

    describe('MAX_PINNED_POSTS is 0', () => {
      beforeEach(async () => {
        config = { ...defaultConfig, MAX_PINNED_POSTS: 0 }

        await Factory.build(
          'post',
          {
            id: 'created-and-pinned-by-same-admin',
          },
          {
            author: admin,
          },
        )
        variables = { ...variables, id: 'created-and-pinned-by-same-admin' }
      })

      it('throws with error that pinning posts is not allowed', async () => {
        await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject({
          data: { pinPost: null },
          errors: [{ message: 'Pinned posts are not allowed!' }],
        })
      })
    })

    describe('MAX_PINNED_POSTS is 1', () => {
      beforeEach(() => {
        config = { ...defaultConfig, MAX_PINNED_POSTS: 1 }
      })

      describe('are allowed to pin posts', () => {
        beforeEach(async () => {
          await Factory.build(
            'post',
            {
              id: 'created-and-pinned-by-same-admin',
            },
            {
              author: admin,
            },
          )
          variables = { ...variables, id: 'created-and-pinned-by-same-admin' }
        })

        it('responds with the updated Post', async () => {
          const expected = {
            data: {
              pinPost: {
                id: 'created-and-pinned-by-same-admin',
                author: {
                  name: 'Admin',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          }

          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject(expected)
        })

        it('sets createdAt date for PINNED', async () => {
          const expected = {
            data: {
              pinPost: {
                id: 'created-and-pinned-by-same-admin',
                pinnedAt: expect.any(String),
              },
            },
            errors: undefined,
          }
          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject(expected)
        })

        it('sets redundant `pinned` property for performant ordering', async () => {
          variables = { ...variables, id: 'created-and-pinned-by-same-admin' }
          const expected = {
            data: { pinPost: { pinned: true } },
            errors: undefined,
          }
          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject(expected)
        })
      })

      describe('post created by another admin', () => {
        let otherAdmin
        beforeEach(async () => {
          otherAdmin = await Factory.build('user', {
            role: 'admin',
            name: 'otherAdmin',
          })
          authenticatedUser = await otherAdmin.toJson()
          await Factory.build(
            'post',
            {
              id: 'created-by-one-admin-pinned-by-different-one',
            },
            {
              author: otherAdmin,
            },
          )
        })

        it('responds with the updated Post', async () => {
          authenticatedUser = await admin.toJson()
          variables = { ...variables, id: 'created-by-one-admin-pinned-by-different-one' }
          const expected = {
            data: {
              pinPost: {
                id: 'created-by-one-admin-pinned-by-different-one',
                author: {
                  name: 'otherAdmin',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          }

          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject(expected)
        })
      })

      describe('post created by another user', () => {
        it('responds with the updated Post', async () => {
          const expected = {
            data: {
              pinPost: {
                id: 'p9876',
                author: {
                  slug: 'the-author',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          }

          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject(expected)
        })
      })

      describe('pinned post already exists', () => {
        let pinnedPost
        beforeEach(async () => {
          await Factory.build(
            'post',
            {
              id: 'only-pinned-post',
            },
            {
              author: admin,
            },
          )
          await mutate({ mutation: pinPost, variables })
        })

        it('removes previous `pinned` attribute', async () => {
          const cypher = 'MATCH (post:Post) WHERE post.pinned IS NOT NULL RETURN post'
          pinnedPost = await database.neode.cypher(cypher, {})
          expect(pinnedPost.records).toHaveLength(1)
          variables = { ...variables, id: 'only-pinned-post' }
          await mutate({ mutation: pinPost, variables })
          pinnedPost = await database.neode.cypher(cypher, {})
          expect(pinnedPost.records).toHaveLength(1)
        })

        it('removes previous PINNED relationship', async () => {
          variables = { ...variables, id: 'only-pinned-post' }
          await mutate({ mutation: pinPost, variables })
          pinnedPost = await database.neode.cypher(
            `MATCH (:User)-[pinned:PINNED]->(post:Post) RETURN post, pinned`,
            {},
          )
          expect(pinnedPost.records).toHaveLength(1)
        })
      })

      describe('post in public group', () => {
        beforeEach(async () => {
          await mutate({
            mutation: CreateGroup,
            variables: {
              name: 'Public Group',
              id: 'public-group',
              about: 'This is a public group',
              groupType: 'public',
              actionRadius: 'regional',
              description:
                'This is a public group to test if the posts of this group can be pinned.',
              categoryIds,
            },
          })
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'public-group-post',
              title: 'Public group post',
              content: 'This is a post in a public group',
              groupId: 'public-group',
              categoryIds,
            },
          })
          variables = { ...variables, id: 'public-group-post' }
        })

        it('can be pinned', async () => {
          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject({
            data: {
              pinPost: {
                id: 'public-group-post',
                author: {
                  slug: 'testuser',
                },
                pinnedBy: {
                  id: 'current-user',
                  name: 'Admin',
                  role: 'admin',
                },
              },
            },
            errors: undefined,
          })
        })
      })

      describe('post in closed group', () => {
        beforeEach(async () => {
          await mutate({
            mutation: CreateGroup,
            variables: {
              name: 'Closed Group',
              id: 'closed-group',
              about: 'This is a closed group',
              groupType: 'closed',
              actionRadius: 'regional',
              description:
                'This is a closed group to test if the posts of this group can be pinned.',
              categoryIds,
            },
          })
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'closed-group-post',
              title: 'Closed group post',
              content: 'This is a post in a closed group',
              groupId: 'closed-group',
              categoryIds,
            },
          })
          variables = { ...variables, id: 'closed-group-post' }
        })

        it('can not be pinned', async () => {
          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject({
            data: {
              pinPost: null,
            },
            errors: undefined,
          })
        })
      })

      describe('post in hidden group', () => {
        beforeEach(async () => {
          await mutate({
            mutation: CreateGroup,
            variables: {
              name: 'Hidden Group',
              id: 'hidden-group',
              about: 'This is a hidden group',
              groupType: 'hidden',
              actionRadius: 'regional',
              description:
                'This is a hidden group to test if the posts of this group can be pinned.',
              categoryIds,
            },
          })
          await mutate({
            mutation: CreatePost,
            variables: {
              id: 'hidden-group-post',
              title: 'Hidden group post',
              content: 'This is a post in a hidden group',
              groupId: 'hidden-group',
              categoryIds,
            },
          })
          variables = { ...variables, id: 'hidden-group-post' }
        })

        it('can not be pinned', async () => {
          await expect(mutate({ mutation: pinPost, variables })).resolves.toMatchObject({
            data: {
              pinPost: null,
            },
            errors: undefined,
          })
        })
      })

      describe('PostOrdering', () => {
        beforeEach(async () => {
          await Factory.build('post', {
            id: 'im-a-pinned-post',
            createdAt: '2019-11-22T17:26:29.070Z',
            pinned: true,
          })
          await Factory.build('post', {
            id: 'i-was-created-before-pinned-post',
            // fairly old, so this should be 3rd
            createdAt: '2019-10-22T17:26:29.070Z',
          })
        })

        describe('order by `pinned_asc` and `createdAt_desc`', () => {
          beforeEach(() => {
            // this is the ordering in the frontend
            variables = { orderBy: ['pinned_asc', 'createdAt_desc'] }
          })

          it('pinned post appear first even when created before other posts', async () => {
            await expect(query({ query: Post, variables })).resolves.toMatchObject({
              data: {
                Post: [
                  {
                    id: 'im-a-pinned-post',
                    pinned: true,
                    createdAt: '2019-11-22T17:26:29.070Z',
                    pinnedAt: expect.any(String),
                  },
                  {
                    id: 'p9876',
                    pinned: null,
                    createdAt: expect.any(String),
                    pinnedAt: null,
                  },
                  {
                    id: 'i-was-created-before-pinned-post',
                    pinned: null,
                    createdAt: '2019-10-22T17:26:29.070Z',
                    pinnedAt: null,
                  },
                ],
              },
              errors: undefined,
            })
          })
        })
      })
    })

    describe('MAX_PINNED_POSTS = 3', () => {
      const postsPinnedCountsQuery = `query { PostsPinnedCounts { maxPinnedPosts, currentlyPinnedPosts } }`

      beforeEach(async () => {
        config = { ...defaultConfig, MAX_PINNED_POSTS: 3 }

        await Factory.build(
          'post',
          {
            id: 'first-post',
            createdAt: '2019-10-22T17:26:29.070Z',
          },
          {
            author: admin,
          },
        )
        await Factory.build(
          'post',
          {
            id: 'second-post',
            createdAt: '2018-10-22T17:26:29.070Z',
          },
          {
            author: admin,
          },
        )
        await Factory.build(
          'post',
          {
            id: 'third-post',
            createdAt: '2017-10-22T17:26:29.070Z',
          },
          {
            author: admin,
          },
        )
        await Factory.build(
          'post',
          {
            id: 'another-post',
          },
          {
            author: admin,
          },
        )
      })

      describe('first post', () => {
        let result

        beforeEach(async () => {
          variables = { ...variables, id: 'first-post' }
          result = await mutate({ mutation: pinPost, variables })
        })

        it('pins the first post', () => {
          expect(result).toMatchObject({
            data: {
              pinPost: {
                id: 'first-post',
                pinned: true,
                pinnedAt: expect.any(String),
                pinnedBy: {
                  id: 'current-user',
                },
              },
            },
          })
        })

        it('returns the correct counts', async () => {
          await expect(
            query({
              query: postsPinnedCountsQuery,
            }),
          ).resolves.toMatchObject({
            data: {
              PostsPinnedCounts: {
                maxPinnedPosts: 3,
                currentlyPinnedPosts: 1,
              },
            },
          })
        })

        describe('second post', () => {
          beforeEach(async () => {
            variables = { ...variables, id: 'second-post' }
            result = await mutate({ mutation: pinPost, variables })
          })

          it('pins the second post', () => {
            expect(result).toMatchObject({
              data: {
                pinPost: {
                  id: 'second-post',
                  pinned: true,
                  pinnedAt: expect.any(String),
                  pinnedBy: {
                    id: 'current-user',
                  },
                },
              },
            })
          })

          it('returns the correct counts', async () => {
            await expect(
              query({
                query: postsPinnedCountsQuery,
              }),
            ).resolves.toMatchObject({
              data: {
                PostsPinnedCounts: {
                  maxPinnedPosts: 3,
                  currentlyPinnedPosts: 2,
                },
              },
            })
          })

          describe('third post', () => {
            beforeEach(async () => {
              variables = { ...variables, id: 'third-post' }
              result = await mutate({ mutation: pinPost, variables })
            })

            it('pins the second post', () => {
              expect(result).toMatchObject({
                data: {
                  pinPost: {
                    id: 'third-post',
                    pinned: true,
                    pinnedAt: expect.any(String),
                    pinnedBy: {
                      id: 'current-user',
                    },
                  },
                },
              })
            })

            it('returns the correct counts', async () => {
              await expect(
                query({
                  query: postsPinnedCountsQuery,
                }),
              ).resolves.toMatchObject({
                data: {
                  PostsPinnedCounts: {
                    maxPinnedPosts: 3,
                    currentlyPinnedPosts: 3,
                  },
                },
              })
            })

            describe('another post', () => {
              beforeEach(async () => {
                variables = { ...variables, id: 'another-post' }
                result = await mutate({ mutation: pinPost, variables })
              })

              it('throws with max pinned posts is reached', () => {
                expect(result).toMatchObject({
                  data: { pinPost: null },
                  errors: [{ message: 'Max number of pinned posts is reached!' }],
                })
              })
            })

            describe('post ordering', () => {
              beforeEach(() => {
                // this is the ordering in the frontend
                variables = { orderBy: ['pinned_asc', 'createdAt_desc'] }
              })

              it('places the pinned posts first, though they are much older', async () => {
                await expect(query({ query: Post, variables })).resolves.toMatchObject({
                  data: {
                    Post: [
                      {
                        id: 'first-post',
                        pinned: true,
                        pinnedAt: expect.any(String),
                        createdAt: '2019-10-22T17:26:29.070Z',
                      },
                      {
                        id: 'second-post',
                        pinned: true,
                        pinnedAt: expect.any(String),
                        createdAt: '2018-10-22T17:26:29.070Z',
                      },
                      {
                        id: 'third-post',
                        pinned: true,
                        pinnedAt: expect.any(String),
                        createdAt: '2017-10-22T17:26:29.070Z',
                      },
                      {
                        id: 'another-post',
                        pinned: null,
                        pinnedAt: null,
                        createdAt: expect.any(String),
                      },
                      {
                        id: 'p9876',
                        pinned: null,
                        pinnedAt: null,
                        createdAt: expect.any(String),
                      },
                    ],
                  },
                  errors: undefined,
                })
              })
            })
          })
        })
      })
    }) 
  }) */
  })
})

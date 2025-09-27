/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { categories } from '@constants/categories'
import pubsubContext from '@context/pubsub'
import Factory, { cleanDatabase } from '@db/factories'
import User from '@db/models/User'
import { DeleteUser } from '@graphql/queries/DeleteUser'
import { resetTrophyBadgesSelected } from '@graphql/queries/resetTrophyBadgesSelected'
import { saveCategorySettings } from '@graphql/queries/saveCategorySettings'
import { setTrophyBadgeSelected } from '@graphql/queries/setTrophyBadgeSelected'
import { switchUserRole } from '@graphql/queries/switchUserRole'
import { updateOnlineStatus } from '@graphql/queries/updateOnlineStatus'
import { UpdateUser } from '@graphql/queries/UpdateUser'
import { UserEmailNotificationSettings, User as userQuery } from '@graphql/queries/User'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { DecodedUser } from '@src/jwt/decode'
// import CONFIG from '@src/config'

const categoryIds = ['cat9']
let user
let admin

let variables

const pubsub = pubsubContext()

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, pubsub })
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

beforeEach(async () => {
  authenticatedUser = null
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('User', () => {
  describe('query by email address', () => {
    beforeEach(async () => {
      const user = await Factory.build('user', {
        id: 'user',
        role: 'user',
      })
      authenticatedUser = await user.toJson()
      variables = {
        email: 'any-email-address@example.org',
      }
      await Factory.build('user', { name: 'Johnny' }, { email: 'any-email-address@example.org' })
    })

    it('is forbidden', async () => {
      await expect(query({ query: userQuery, variables })).resolves.toMatchObject({
        errors: [{ message: 'Not Authorized!' }],
      })
    })

    describe('as admin', () => {
      beforeEach(async () => {
        const admin = await Factory.build(
          'user',
          {
            role: 'admin',
          },
          {
            email: 'admin@example.org',
            password: '1234',
          },
        )
        authenticatedUser = await admin.toJson()
      })

      it('is permitted', async () => {
        await expect(query({ query: userQuery, variables })).resolves.toMatchObject({
          data: { User: [{ name: 'Johnny' }] },
          errors: undefined,
        })
      })

      it('non-existing email address, issue #2294', async () => {
        // see: https://github.com/Human-Connection/Human-Connection/issues/2294
        await expect(
          query({
            query: userQuery,
            variables: {
              email: 'this-email-does-not-exist@example.org',
            },
          }),
        ).resolves.toMatchObject({
          data: { User: [] },
          errors: undefined,
        })
      })
    })
  })
})

describe('UpdateUser', () => {
  beforeEach(async () => {
    variables = {
      id: 'u47',
      name: 'John Doughnut',
    }

    user = await Factory.build(
      'user',
      {
        id: 'u47',
        name: 'John Doe',
        termsAndConditionsAgreedVersion: null,
        termsAndConditionsAgreedAt: null,
        allowEmbedIframes: false,
      },
      {
        email: 'user@example.org',
      },
    )
  })

  describe('as another user', () => {
    beforeEach(async () => {
      const someoneElse = await Factory.build(
        'user',
        {
          name: 'James Doe',
        },
        {
          email: 'someone-else@example.org',
        },
      )

      authenticatedUser = await someoneElse.toJson()
    })

    it('is not allowed to change other user accounts', async () => {
      await expect(mutate({ mutation: UpdateUser, variables })).resolves.toMatchObject({
        data: { UpdateUser: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('as the same user', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('updates the name', async () => {
      const expected = {
        data: {
          UpdateUser: {
            id: 'u47',
            name: 'John Doughnut',
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: UpdateUser, variables })).resolves.toMatchObject(expected)
    })

    describe('given a new agreed version of terms and conditions', () => {
      beforeEach(async () => {
        variables = { ...variables, termsAndConditionsAgreedVersion: '0.0.2' }
      })
      it('update termsAndConditionsAgreedVersion', async () => {
        const expected = {
          data: {
            UpdateUser: expect.objectContaining({
              termsAndConditionsAgreedVersion: '0.0.2',
              termsAndConditionsAgreedAt: expect.any(String),
            }),
          },
          errors: undefined,
        }

        await expect(mutate({ mutation: UpdateUser, variables })).resolves.toMatchObject(expected)
      })
    })

    describe('given any attribute other than termsAndConditionsAgreedVersion', () => {
      beforeEach(async () => {
        variables = { ...variables, name: 'any name' }
      })
      it('update termsAndConditionsAgreedVersion', async () => {
        const expected = {
          data: {
            UpdateUser: expect.objectContaining({
              termsAndConditionsAgreedVersion: null,
              termsAndConditionsAgreedAt: null,
            }),
          },
          errors: undefined,
        }

        await expect(mutate({ mutation: UpdateUser, variables })).resolves.toMatchObject(expected)
      })
    })

    it('rejects if version of terms and conditions has wrong format', async () => {
      variables = {
        ...variables,
        termsAndConditionsAgreedVersion: 'invalid version format',
      }
      const { errors } = await mutate({ mutation: UpdateUser, variables })
      expect(errors?.[0]).toHaveProperty('message', 'Invalid version format!')
    })

    describe('supports updating location', () => {
      describe('change location to "Hamburg, New Jersey, United States"', () => {
        it('has updated location to  "Hamburg, New Jersey, United States"', async () => {
          variables = { ...variables, locationName: 'Hamburg, New Jersey, United States' }
          await expect(mutate({ mutation: UpdateUser, variables })).resolves.toMatchObject({
            data: {
              UpdateUser: {
                locationName: 'Hamburg, New Jersey, United States',
                location: expect.objectContaining({
                  name: 'Hamburg',
                  nameDE: 'Hamburg',
                  nameEN: 'Hamburg',
                }),
              },
            },
            errors: undefined,
          })
        })
      })

      describe('change location to unset location', () => {
        it('has updated location to  unset location', async () => {
          variables = { ...variables, locationName: '' }
          await expect(mutate({ mutation: UpdateUser, variables })).resolves.toMatchObject({
            data: {
              UpdateUser: {
                locationName: null,
                location: null,
              },
            },
            errors: undefined,
          })
        })
      })
    })
  })
})

describe('Delete a User as admin', () => {
  beforeEach(async () => {
    variables = { id: ' u343', resource: [] }

    user = await Factory.build('user', {
      name: 'My name should be deleted',
      about: 'along with my about',
      id: 'u343',
    })
  })

  describe('authenticated as Admin', () => {
    beforeEach(async () => {
      admin = await Factory.build(
        'user',
        {
          role: 'admin',
        },
        {
          email: 'admin@example.org',
          password: '1234',
        },
      )
      authenticatedUser = await admin.toJson()
    })

    describe('deleting a user account', () => {
      beforeEach(() => {
        variables = { ...variables, id: 'u343' }
      })

      describe('given posts and comments', () => {
        beforeEach(async () => {
          await Factory.build('category', {
            id: 'cat9',
            name: 'Democracy & Politics',
            icon: 'university',
          })
          await Factory.build(
            'post',
            {
              id: 'p139',
              content: 'Post by user u343',
            },
            {
              author: user,
              categoryIds,
            },
          )
          await Factory.build(
            'comment',
            {
              id: 'c155',
              content: 'Comment by user u343',
            },
            {
              author: user,
            },
          )
          await Factory.build(
            'comment',
            {
              id: 'c156',
              content: "A comment by someone else on user u343's post",
            },
            {
              postId: 'p139',
            },
          )
        })

        it("deletes account, but doesn't delete posts or comments by default", async () => {
          const expectedResponse = {
            data: {
              DeleteUser: {
                id: 'u343',
                name: 'UNAVAILABLE',
                about: 'UNAVAILABLE',
                deleted: true,
                contributions: [
                  {
                    id: 'p139',
                    content: 'Post by user u343',
                    contentExcerpt: 'Post by user u343',
                    deleted: false,
                    comments: [
                      {
                        id: 'c156',
                        content: "A comment by someone else on user u343's post",
                        contentExcerpt: "A comment by someone else on user u343's post",
                        deleted: false,
                      },
                    ],
                  },
                ],
                comments: [
                  {
                    id: 'c155',
                    content: 'Comment by user u343',
                    contentExcerpt: 'Comment by user u343',
                    deleted: false,
                  },
                ],
              },
            },
            errors: undefined,
          }
          await expect(mutate({ mutation: DeleteUser, variables })).resolves.toMatchObject(
            expectedResponse,
          )
        })

        describe('deletion of all posts and comments requested', () => {
          beforeEach(() => {
            variables = { ...variables, resource: ['Comment', 'Post'] }
          })

          it('marks posts and comments as deleted', async () => {
            const expectedResponse = {
              data: {
                DeleteUser: {
                  id: 'u343',
                  name: 'UNAVAILABLE',
                  about: 'UNAVAILABLE',
                  deleted: true,
                  contributions: [
                    {
                      id: 'p139',
                      content: 'UNAVAILABLE',
                      contentExcerpt: 'UNAVAILABLE',
                      deleted: true,
                      comments: [
                        {
                          id: 'c156',
                          content: 'UNAVAILABLE',
                          contentExcerpt: 'UNAVAILABLE',
                          deleted: true,
                        },
                      ],
                    },
                  ],
                  comments: [
                    {
                      id: 'c155',
                      content: 'UNAVAILABLE',
                      contentExcerpt: 'UNAVAILABLE',
                      deleted: true,
                    },
                  ],
                },
              },
              errors: undefined,
            }
            await expect(mutate({ mutation: DeleteUser, variables })).resolves.toMatchObject(
              expectedResponse,
            )
          })
        })
      })

      describe('connected `EmailAddress` nodes', () => {
        it('will be removed completely', async () => {
          await expect(database.neode.all('EmailAddress')).resolves.toHaveLength(2)
          await mutate({ mutation: DeleteUser, variables })

          await expect(database.neode.all('EmailAddress')).resolves.toHaveLength(1)
        })
      })

      describe('connected `SocialMedia` nodes', () => {
        beforeEach(async () => {
          const socialMedia = await Factory.build('socialMedia')
          await socialMedia.relateTo(user, 'ownedBy')
        })

        it('will be removed completely', async () => {
          await expect(database.neode.all('SocialMedia')).resolves.toHaveLength(1)
          await mutate({ mutation: DeleteUser, variables })
          await expect(database.neode.all('SocialMedia')).resolves.toHaveLength(0)
        })
      })

      describe('connected follow relations', () => {
        beforeEach(async () => {
          const userIFollow = await Factory.build('user', {
            name: 'User I Follow',
            about: 'I follow this user',
            id: 'uifollow',
          })

          const userFollowingMe = await Factory.build('user', {
            name: 'User Following Me',
            about: 'This user follows me',
            id: 'ufollowsme',
          })
          await user.relateTo(userIFollow, 'following')
          await userFollowingMe.relateTo(user, 'following')
        })

        it('will be removed completely', async () => {
          const relation = await database.neode.cypher(
            'MATCH (user:User {id: $id})-[relationship:FOLLOWS]-(:User) RETURN relationship',
            { id: (await user.toJson()).id },
          )
          const relations = relation.records.map((record) => record.get('relationship'))
          expect(relations).toHaveLength(2)
          await mutate({ mutation: DeleteUser, variables })
          const relation2 = await database.neode.cypher(
            'MATCH (user:User {id: $id})-[relationship:FOLLOWS]-(:User) RETURN relationship',
            { id: (await user.toJson()).id },
          )
          const relations2 = relation2.records.map((record) => record.get('relationship'))
          expect(relations2).toHaveLength(0)
        })
      })
    })
  })
})

describe('switch user role', () => {
  beforeEach(async () => {
    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    admin = await Factory.build('user', {
      role: 'admin',
      id: 'admin',
    })
  })

  describe('as simple user', () => {
    it('cannot change the role', async () => {
      authenticatedUser = await user.toJson()
      variables = {
        id: 'user',
        role: 'admin',
      }
      await expect(mutate({ mutation: switchUserRole, variables })).resolves.toMatchObject({
        data: { switchUserRole: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('as admin', () => {
    it('changes the role of other user', async () => {
      authenticatedUser = await admin.toJson()
      variables = {
        id: 'user',
        role: 'moderator',
      }
      await expect(mutate({ mutation: switchUserRole, variables })).resolves.toEqual(
        expect.objectContaining({
          data: {
            switchUserRole: expect.objectContaining({
              role: 'moderator',
            }),
          },
        }),
      )
    })

    it('cannot change own role', async () => {
      authenticatedUser = await admin.toJson()
      variables = {
        id: 'admin',
        role: 'moderator',
      }
      await expect(mutate({ mutation: switchUserRole, variables })).resolves.toEqual(
        expect.objectContaining({
          errors: [
            expect.objectContaining({
              message: 'you-cannot-change-your-own-role',
            }),
          ],
        }),
      )
    })
  })
})

let anotherUser

describe('emailNotificationSettings', () => {
  beforeEach(async () => {
    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    anotherUser = await Factory.build('user', {
      id: 'anotherUser',
      role: 'anotherUser',
    })
  })

  describe('query the field', () => {
    describe('as another user', () => {
      it('throws an error', async () => {
        authenticatedUser = await anotherUser.toJson()
        const targetUser = await user.toJson()
        await expect(
          query({ query: UserEmailNotificationSettings, variables: { id: targetUser.id } }),
        ).resolves.toMatchObject({
          data: { User: [null] },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('as self', () => {
      it('returns the emailNotificationSettings', async () => {
        authenticatedUser = await user.toJson()
        await expect(
          query({
            query: UserEmailNotificationSettings,
            variables: { id: authenticatedUser?.id },
          }),
        ).resolves.toMatchObject({
          data: {
            User: [
              {
                emailNotificationSettings: [
                  {
                    type: 'post',
                    settings: [
                      {
                        name: 'commentOnObservedPost',
                        value: true,
                      },
                      {
                        name: 'mention',
                        value: true,
                      },
                      {
                        name: 'followingUsers',
                        value: true,
                      },
                      {
                        name: 'postInGroup',
                        value: true,
                      },
                    ],
                  },
                  {
                    type: 'chat',
                    settings: [
                      {
                        name: 'chatMessage',
                        value: true,
                      },
                    ],
                  },
                  {
                    type: 'group',
                    settings: [
                      {
                        name: 'groupMemberJoined',
                        value: true,
                      },
                      {
                        name: 'groupMemberLeft',
                        value: true,
                      },
                      {
                        name: 'groupMemberRemoved',
                        value: true,
                      },
                      {
                        name: 'groupMemberRoleChanged',
                        value: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        })
      })
    })
  })

  describe('mutate the field', () => {
    const emailNotificationSettings = [{ name: 'mention', value: false }]

    describe('as another user', () => {
      it('throws an error', async () => {
        authenticatedUser = await anotherUser.toJson()
        const targetUser = await user.toJson()
        await expect(
          mutate({
            mutation: UpdateUser,
            variables: { id: targetUser.id, emailNotificationSettings },
          }),
        ).resolves.toMatchObject({
          data: { UpdateUser: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('as self', () => {
      it('updates the emailNotificationSettings', async () => {
        authenticatedUser = (await user.toJson()) as DecodedUser
        await expect(
          mutate({
            mutation: UpdateUser,
            variables: { id: authenticatedUser.id, emailNotificationSettings },
          }),
        ).resolves.toMatchObject({
          data: {
            UpdateUser: {
              emailNotificationSettings: [
                {
                  type: 'post',
                  settings: [
                    {
                      name: 'commentOnObservedPost',
                      value: true,
                    },
                    {
                      name: 'mention',
                      value: false,
                    },
                    {
                      name: 'followingUsers',
                      value: true,
                    },
                    {
                      name: 'postInGroup',
                      value: true,
                    },
                  ],
                },
                {
                  type: 'chat',
                  settings: [
                    {
                      name: 'chatMessage',
                      value: true,
                    },
                  ],
                },
                {
                  type: 'group',
                  settings: [
                    {
                      name: 'groupMemberJoined',
                      value: true,
                    },
                    {
                      name: 'groupMemberLeft',
                      value: true,
                    },
                    {
                      name: 'groupMemberRemoved',
                      value: true,
                    },
                    {
                      name: 'groupMemberRoleChanged',
                      value: true,
                    },
                  ],
                },
              ],
            },
          },
        })
      })
    })
  })
})

describe('save category settings', () => {
  beforeEach(async () => {
    await Promise.all(
      categories.map(({ icon, name }, index) => {
        return Factory.build('category', {
          id: `cat${index + 1}`,
          slug: name,
          name,
          icon,
        })
      }),
    )
  })

  beforeEach(async () => {
    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    variables = {
      activeCategories: ['cat1', 'cat3', 'cat5'],
    }
  })

  describe('not authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = null
    })

    it('throws an error', async () => {
      await expect(mutate({ mutation: saveCategorySettings, variables })).resolves.toMatchObject({
        data: { saveCategorySettings: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    describe('no categories saved', () => {
      it('returns true for active categories mutation', async () => {
        await expect(mutate({ mutation: saveCategorySettings, variables })).resolves.toEqual(
          expect.objectContaining({
            data: { saveCategorySettings: true },
          }),
        )
      })

      describe('query for user', () => {
        beforeEach(async () => {
          await mutate({ mutation: saveCategorySettings, variables })
        })

        it('returns the active categories when user is queried', async () => {
          await expect(
            query({ query: userQuery, variables: { id: authenticatedUser?.id } }),
          ).resolves.toMatchObject({
            data: {
              User: [
                {
                  activeCategories: expect.arrayContaining(['cat1', 'cat3', 'cat5']),
                },
              ],
            },
          })
        })
      })
    })

    describe('categories already saved', () => {
      beforeEach(async () => {
        variables = {
          activeCategories: ['cat1', 'cat3', 'cat5'],
        }
        await mutate({ mutation: saveCategorySettings, variables })
        variables = {
          activeCategories: ['cat10', 'cat11', 'cat12', 'cat8', 'cat9'],
        }
      })

      it('returns true', async () => {
        await expect(mutate({ mutation: saveCategorySettings, variables })).resolves.toEqual(
          expect.objectContaining({
            data: { saveCategorySettings: true },
          }),
        )
      })

      describe('query for user', () => {
        beforeEach(async () => {
          await mutate({ mutation: saveCategorySettings, variables })
        })

        it('returns the new active categories when user is queried', async () => {
          await expect(
            query({ query: userQuery, variables: { id: authenticatedUser?.id } }),
          ).resolves.toMatchObject({
            data: {
              User: [
                {
                  activeCategories: expect.arrayContaining([
                    'cat10',
                    'cat11',
                    'cat12',
                    'cat8',
                    'cat9',
                  ]),
                },
              ],
            },
          })
        })
      })
    })
  })
})

describe('updateOnlineStatus', () => {
  beforeEach(async () => {
    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    variables = {
      status: 'online',
    }
  })

  describe('not authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = null
    })

    it('throws an error', async () => {
      await expect(mutate({ mutation: updateOnlineStatus, variables })).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    describe('set online', () => {
      it('returns true and saves the user in the database as online', async () => {
        await expect(mutate({ mutation: updateOnlineStatus, variables })).resolves.toEqual(
          expect.objectContaining({
            data: { updateOnlineStatus: true },
          }),
        )

        const cypher = 'MATCH (u:User {id: $id}) RETURN u'
        const result = await database.neode.cypher(cypher, { id: authenticatedUser?.id })
        const dbUser = database.neode.hydrateFirst(result, 'u', database.neode.model('User'))
        await expect(dbUser.toJson()).resolves.toMatchObject({
          lastOnlineStatus: 'online',
        })
        await expect(dbUser.toJson()).resolves.not.toMatchObject({
          awaySince: expect.any(String),
        })
      })
    })

    describe('set away', () => {
      beforeEach(() => {
        variables = {
          status: 'away',
        }
      })

      it('returns true and saves the user in the database as away', async () => {
        await expect(mutate({ mutation: updateOnlineStatus, variables })).resolves.toEqual(
          expect.objectContaining({
            data: { updateOnlineStatus: true },
          }),
        )

        const cypher = 'MATCH (u:User {id: $id}) RETURN u'
        const result = await database.neode.cypher(cypher, { id: authenticatedUser?.id })
        const dbUser = database.neode.hydrateFirst(result, 'u', database.neode.model('User'))
        await expect(dbUser.toJson()).resolves.toMatchObject({
          lastOnlineStatus: 'away',
          awaySince: expect.any(String),
        })
      })

      it('stores the timestamp of the first away call', async () => {
        await expect(mutate({ mutation: updateOnlineStatus, variables })).resolves.toEqual(
          expect.objectContaining({
            data: { updateOnlineStatus: true },
          }),
        )

        const cypher = 'MATCH (u:User {id: $id}) RETURN u'
        const result = await database.neode.cypher(cypher, { id: authenticatedUser?.id })
        const dbUser = database.neode.hydrateFirst<typeof User>(
          result,
          'u',
          database.neode.model('User'),
        )
        await expect(dbUser.toJson()).resolves.toMatchObject({
          lastOnlineStatus: 'away',
          awaySince: expect.any(String),
        })

        const awaySince = (await dbUser.toJson()).awaySince

        await expect(mutate({ mutation: updateOnlineStatus, variables })).resolves.toEqual(
          expect.objectContaining({
            data: { updateOnlineStatus: true },
          }),
        )

        const result2 = await database.neode.cypher(cypher, { id: authenticatedUser?.id })
        const dbUser2 = database.neode.hydrateFirst(result2, 'u', database.neode.model('User'))
        await expect(dbUser2.toJson()).resolves.toMatchObject({
          lastOnlineStatus: 'away',
          awaySince,
        })
      })
    })
  })
})

describe('setTrophyBadgeSelected', () => {
  beforeEach(async () => {
    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    const badgeBear = await Factory.build('badge', {
      id: 'trophy_bear',
      type: 'trophy',
      description: 'You earned a Bear',
      icon: '/img/badges/trophy_blue_bear.svg',
    })
    const badgePanda = await Factory.build('badge', {
      id: 'trophy_panda',
      type: 'trophy',
      description: 'You earned a Panda',
      icon: '/img/badges/trophy_blue_panda.svg',
    })
    await Factory.build('badge', {
      id: 'trophy_rabbit',
      type: 'trophy',
      description: 'You earned a Rabbit',
      icon: '/img/badges/trophy_blue_rabbit.svg',
    })

    await user.relateTo(badgeBear, 'rewarded')
    await user.relateTo(badgePanda, 'rewarded')
  })

  describe('not authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = null
    })

    it('throws an error', async () => {
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 0, badgeId: 'trophy_bear' },
        }),
      ).resolves.toMatchObject({
        data: { setTrophyBadgeSelected: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('throws Error when slot is out of bound', async () => {
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: -1, badgeId: 'trophy_bear' },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          errors: [
            expect.objectContaining({
              message: 'Invalid slot! There is only 9 badge-slots to fill',
            }),
          ],
        }),
      )
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 9, badgeId: 'trophy_bear' },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          errors: [
            expect.objectContaining({
              message: 'Invalid slot! There is only 9 badge-slots to fill',
            }),
          ],
        }),
      )
    })

    it('throws Error when badge was not rewarded to user', async () => {
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 0, badgeId: 'trophy_rabbit' },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          errors: [
            expect.objectContaining({
              message: 'Error: You cannot set badges not rewarded to you.',
            }),
          ],
        }),
      )
    })

    it('throws Error when badge is unknown', async () => {
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 0, badgeId: 'trophy_unknown' },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          errors: [
            expect.objectContaining({
              message: 'Error: You cannot set badges not rewarded to you.',
            }),
          ],
        }),
      )
    })

    it('returns the user with badges set on slots', async () => {
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 0, badgeId: 'trophy_bear' },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          data: {
            setTrophyBadgeSelected: {
              badgeTrophiesCount: 2,
              badgeTrophiesSelected: [
                {
                  id: 'trophy_bear',
                  isDefault: false,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
              ],
              badgeTrophiesUnused: [
                {
                  id: 'trophy_panda',
                },
              ],
              badgeTrophiesUnusedCount: 1,
            },
          },
        }),
      )
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 5, badgeId: 'trophy_panda' },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          data: {
            setTrophyBadgeSelected: {
              badgeTrophiesCount: 2,
              badgeTrophiesSelected: [
                {
                  id: 'trophy_bear',
                  isDefault: false,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'trophy_panda',
                  isDefault: false,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
              ],
              badgeTrophiesUnused: [],
              badgeTrophiesUnusedCount: 0,
            },
          },
        }),
      )
    })

    describe('set badge to null or default', () => {
      beforeEach(async () => {
        await mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 0, badgeId: 'trophy_bear' },
        })
        await mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 5, badgeId: 'trophy_panda' },
        })
      })

      it('returns the user with no badge set on the selected slot when sending null', async () => {
        await expect(
          mutate({
            mutation: setTrophyBadgeSelected,
            variables: { slot: 5, badgeId: null },
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              setTrophyBadgeSelected: {
                badgeTrophiesCount: 2,
                badgeTrophiesSelected: [
                  {
                    id: 'trophy_bear',
                    isDefault: false,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                ],
                badgeTrophiesUnused: [
                  {
                    id: 'trophy_panda',
                  },
                ],
                badgeTrophiesUnusedCount: 1,
              },
            },
          }),
        )
      })

      it('returns the user with no badge set on the selected slot when sending default_trophy', async () => {
        await expect(
          mutate({
            mutation: setTrophyBadgeSelected,
            variables: { slot: 5, badgeId: 'default_trophy' },
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              setTrophyBadgeSelected: {
                badgeTrophiesCount: 2,
                badgeTrophiesSelected: [
                  {
                    id: 'trophy_bear',
                    isDefault: false,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                ],
                badgeTrophiesUnused: [
                  {
                    id: 'trophy_panda',
                  },
                ],
                badgeTrophiesUnusedCount: 1,
              },
            },
          }),
        )
      })
    })
  })
})

describe('resetTrophyBadgesSelected', () => {
  beforeEach(async () => {
    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    const badgeBear = await Factory.build('badge', {
      id: 'trophy_bear',
      type: 'trophy',
      description: 'You earned a Bear',
      icon: '/img/badges/trophy_blue_bear.svg',
    })
    const badgePanda = await Factory.build('badge', {
      id: 'trophy_panda',
      type: 'trophy',
      description: 'You earned a Panda',
      icon: '/img/badges/trophy_blue_panda.svg',
    })
    await Factory.build('badge', {
      id: 'trophy_rabbit',
      type: 'trophy',
      description: 'You earned a Rabbit',
      icon: '/img/badges/trophy_blue_rabbit.svg',
    })

    await user.relateTo(badgeBear, 'rewarded')
    await user.relateTo(badgePanda, 'rewarded')

    await mutate({
      mutation: setTrophyBadgeSelected,
      variables: { slot: 0, badgeId: 'trophy_bear' },
    })
    await mutate({
      mutation: setTrophyBadgeSelected,
      variables: { slot: 5, badgeId: 'trophy_panda' },
    })
  })

  describe('not authenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws an error', async () => {
      await expect(mutate({ mutation: resetTrophyBadgesSelected })).resolves.toMatchObject({
        data: { resetTrophyBadgesSelected: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('returns the user with no profile badges badges set', async () => {
      await expect(mutate({ mutation: resetTrophyBadgesSelected })).resolves.toEqual(
        expect.objectContaining({
          data: {
            resetTrophyBadgesSelected: {
              badgeTrophiesCount: 2,
              badgeTrophiesSelected: [
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
              ],
              badgeTrophiesUnused: expect.arrayContaining([
                {
                  id: 'trophy_panda',
                },
                {
                  id: 'trophy_bear',
                },
              ]),
              badgeTrophiesUnusedCount: 2,
            },
          },
        }),
      )
    })
  })
})

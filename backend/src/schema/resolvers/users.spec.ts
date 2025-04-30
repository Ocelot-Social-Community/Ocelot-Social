/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import { categories } from '@constants/categories'
import pubsubContext from '@context/pubsub'
import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import User from '@models/User'
import createServer from '@src/server'

const categoryIds = ['cat9']
let user
let admin
let authenticatedUser

let query
let mutate
let variables

const driver = getDriver()
const neode = getNeode()
const pubsub = pubsubContext()

const deleteUserMutation = gql`
  mutation ($id: ID!, $resource: [Deletable]) {
    DeleteUser(id: $id, resource: $resource) {
      id
      name
      about
      deleted
      contributions {
        id
        content
        contentExcerpt
        deleted
        comments {
          id
          content
          contentExcerpt
          deleted
        }
      }
      comments {
        id
        content
        contentExcerpt
        deleted
      }
    }
  }
`
const switchUserRoleMutation = gql`
  mutation ($role: UserRole!, $id: ID!) {
    switchUserRole(role: $role, id: $id) {
      name
      role
      id
      updatedAt
      email
    }
  }
`

const saveCategorySettings = gql`
  mutation ($activeCategories: [String]) {
    saveCategorySettings(activeCategories: $activeCategories)
  }
`

const updateOnlineStatus = gql`
  mutation ($status: OnlineStatus!) {
    updateOnlineStatus(status: $status)
  }
`

const setTrophyBadgeSelected = gql`
  mutation ($slot: Int!, $badgeId: ID) {
    setTrophyBadgeSelected(slot: $slot, badgeId: $badgeId) {
      badgeTrophiesCount
      badgeTrophiesSelected {
        id
        isDefault
      }
      badgeTrophiesUnused {
        id
      }
      badgeTrophiesUnusedCount
    }
  }
`

const resetTrophyBadgesSelected = gql`
  mutation {
    resetTrophyBadgesSelected {
      badgeTrophiesCount
      badgeTrophiesSelected {
        id
        isDefault
      }
      badgeTrophiesUnused {
        id
      }
      badgeTrophiesUnusedCount
    }
  }
`

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
        pubsub,
      }
    },
  })
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('User', () => {
  describe('query by email address', () => {
    let userQuery

    beforeEach(async () => {
      userQuery = gql`
        query ($email: String) {
          User(email: $email) {
            name
          }
        }
      `
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
  let updateUserMutation

  beforeEach(async () => {
    updateUserMutation = gql`
      mutation (
        $id: ID!
        $name: String
        $termsAndConditionsAgreedVersion: String
        $locationName: String # empty string '' sets it to null
      ) {
        UpdateUser(
          id: $id
          name: $name
          termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
          locationName: $locationName
        ) {
          id
          name
          termsAndConditionsAgreedVersion
          termsAndConditionsAgreedAt
          locationName
          location {
            name
            nameDE
            nameEN
          }
        }
      }
    `
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
      const { errors } = await mutate({ mutation: updateUserMutation, variables })
      expect(errors[0]).toHaveProperty('message', 'Not Authorized!')
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
      await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject(
        expected,
      )
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

        await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject(
          expected,
        )
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

        await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })
    })

    it('rejects if version of terms and conditions has wrong format', async () => {
      variables = {
        ...variables,
        termsAndConditionsAgreedVersion: 'invalid version format',
      }
      const { errors } = await mutate({ mutation: updateUserMutation, variables })
      expect(errors[0]).toHaveProperty('message', 'Invalid version format!')
    })

    describe('supports updating location', () => {
      describe('change location to "Hamburg, New Jersey, United States"', () => {
        it('has updated location to  "Hamburg, New Jersey, United States"', async () => {
          variables = { ...variables, locationName: 'Hamburg, New Jersey, United States' }
          await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject({
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
          await expect(mutate({ mutation: updateUserMutation, variables })).resolves.toMatchObject({
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
          await expect(mutate({ mutation: deleteUserMutation, variables })).resolves.toMatchObject(
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
            await expect(
              mutate({ mutation: deleteUserMutation, variables }),
            ).resolves.toMatchObject(expectedResponse)
          })
        })
      })

      describe('connected `EmailAddress` nodes', () => {
        it('will be removed completely', async () => {
          await expect(neode.all('EmailAddress')).resolves.toHaveLength(2)
          await mutate({ mutation: deleteUserMutation, variables })

          await expect(neode.all('EmailAddress')).resolves.toHaveLength(1)
        })
      })

      describe('connected `SocialMedia` nodes', () => {
        beforeEach(async () => {
          const socialMedia = await Factory.build('socialMedia')
          await socialMedia.relateTo(user, 'ownedBy')
        })

        it('will be removed completely', async () => {
          await expect(neode.all('SocialMedia')).resolves.toHaveLength(1)
          await mutate({ mutation: deleteUserMutation, variables })
          await expect(neode.all('SocialMedia')).resolves.toHaveLength(0)
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
      await expect(mutate({ mutation: switchUserRoleMutation, variables })).resolves.toEqual(
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

  describe('as admin', () => {
    it('changes the role of other user', async () => {
      authenticatedUser = await admin.toJson()
      variables = {
        id: 'user',
        role: 'moderator',
      }
      await expect(mutate({ mutation: switchUserRoleMutation, variables })).resolves.toEqual(
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
      await expect(mutate({ mutation: switchUserRoleMutation, variables })).resolves.toEqual(
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
const emailNotificationSettingsQuery = gql`
  query ($id: ID!) {
    User(id: $id) {
      emailNotificationSettings {
        type
        settings {
          name
          value
        }
      }
    }
  }
`

const emailNotificationSettingsMutation = gql`
  mutation ($id: ID!, $emailNotificationSettings: [EmailNotificationSettingsInput]!) {
    UpdateUser(id: $id, emailNotificationSettings: $emailNotificationSettings) {
      emailNotificationSettings {
        type
        settings {
          name
          value
        }
      }
    }
  }
`

const distanceToMeQuery = gql`
  query ($id: ID!) {
    User(id: $id) {
      distanceToMe
    }
  }
`
let myPlaceUser, otherPlaceUser, noCordsPlaceUser, noPlaceUser

describe('distanceToMe', () => {
  beforeEach(async () => {
    const Hamburg = await Factory.build('location', {
      id: 'region.5127278006398860',
      name: 'Hamburg',
      type: 'region',
      lng: 10.0,
      lat: 53.55,
      nameES: 'Hamburgo',
      nameFR: 'Hambourg',
      nameIT: 'Amburgo',
      nameEN: 'Hamburg',
      namePT: 'Hamburgo',
      nameDE: 'Hamburg',
      nameNL: 'Hamburg',
      namePL: 'Hamburg',
      nameRU: 'Гамбург',
    })
    const Germany = await Factory.build('location', {
      id: 'country.10743216036480410',
      name: 'Germany',
      type: 'country',
      namePT: 'Alemanha',
      nameDE: 'Deutschland',
      nameES: 'Alemania',
      nameNL: 'Duitsland',
      namePL: 'Niemcy',
      nameFR: 'Allemagne',
      nameIT: 'Germania',
      nameEN: 'Germany',
      nameRU: 'Германия',
    })
    const Paris = await Factory.build('location', {
      id: 'region.9397217726497330',
      name: 'Paris',
      type: 'region',
      lng: 2.35183,
      lat: 48.85658,
      nameES: 'París',
      nameFR: 'Paris',
      nameIT: 'Parigi',
      nameEN: 'Paris',
      namePT: 'Paris',
      nameDE: 'Paris',
      nameNL: 'Parijs',
      namePL: 'Paryż',
      nameRU: 'Париж',
    })

    user = await Factory.build('user', {
      id: 'user',
      role: 'user',
    })
    await user.relateTo(Hamburg, 'isIn')

    myPlaceUser = await Factory.build('user', {
      id: 'myPlaceUser',
      role: 'user',
    })
    await myPlaceUser.relateTo(Hamburg, 'isIn')

    otherPlaceUser = await Factory.build('user', {
      id: 'otherPlaceUser',
      role: 'user',
    })
    await otherPlaceUser.relateTo(Paris, 'isIn')

    noCordsPlaceUser = await Factory.build('user', {
      id: 'noCordsPlaceUser',
      role: 'user',
    })
    await noCordsPlaceUser.relateTo(Germany, 'isIn')

    noPlaceUser = await Factory.build('user', {
      id: 'noPlaceUser',
      role: 'user',
    })
  })

  describe('query the field', () => {
    describe('for self user', () => {
      it('returns null', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await user.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  distanceToMe: null,
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for myPlaceUser', () => {
      it('returns 0', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await myPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  distanceToMe: 0,
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for otherPlaceUser', () => {
      it('returns a number', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await otherPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  distanceToMe: 746,
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for noCordsPlaceUser', () => {
      it('returns null', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await noCordsPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  distanceToMe: null,
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })

    describe('for noPlaceUser', () => {
      it('returns null', async () => {
        authenticatedUser = await user.toJson()
        const targetUser = await noPlaceUser.toJson()
        await expect(
          query({ query: distanceToMeQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
            data: {
              User: [
                {
                  distanceToMe: null,
                },
              ],
            },
            errors: undefined,
          }),
        )
      })
    })
  })
})

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
          query({ query: emailNotificationSettingsQuery, variables: { id: targetUser.id } }),
        ).resolves.toEqual(
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

    describe('as self', () => {
      it('returns the emailNotificationSettings', async () => {
        authenticatedUser = await user.toJson()
        await expect(
          query({ query: emailNotificationSettingsQuery, variables: { id: authenticatedUser.id } }),
        ).resolves.toEqual(
          expect.objectContaining({
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
          }),
        )
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
            mutation: emailNotificationSettingsMutation,
            variables: { id: targetUser.id, emailNotificationSettings },
          }),
        ).resolves.toEqual(
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

    describe('as self', () => {
      it('updates the emailNotificationSettings', async () => {
        authenticatedUser = await user.toJson()
        await expect(
          mutate({
            mutation: emailNotificationSettingsMutation,
            variables: { id: authenticatedUser.id, emailNotificationSettings },
          }),
        ).resolves.toEqual(
          expect.objectContaining({
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
          }),
        )
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
      authenticatedUser = undefined
    })

    it('throws an error', async () => {
      await expect(mutate({ mutation: saveCategorySettings, variables })).resolves.toEqual(
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
      authenticatedUser = await user.toJson()
    })

    const userQuery = gql`
      query ($id: ID) {
        User(id: $id) {
          activeCategories
        }
      }
    `

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
            query({ query: userQuery, variables: { id: authenticatedUser.id } }),
          ).resolves.toEqual(
            expect.objectContaining({
              data: {
                User: [
                  {
                    activeCategories: expect.arrayContaining(['cat1', 'cat3', 'cat5']),
                  },
                ],
              },
            }),
          )
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
            query({ query: userQuery, variables: { id: authenticatedUser.id } }),
          ).resolves.toEqual(
            expect.objectContaining({
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
            }),
          )
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
      authenticatedUser = undefined
    })

    it('throws an error', async () => {
      await expect(mutate({ mutation: updateOnlineStatus, variables })).resolves.toEqual(
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
        const result = await neode.cypher(cypher, { id: authenticatedUser.id })
        const dbUser = neode.hydrateFirst(result, 'u', neode.model('User'))
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
        const result = await neode.cypher(cypher, { id: authenticatedUser.id })
        const dbUser = neode.hydrateFirst(result, 'u', neode.model('User'))
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
        const result = await neode.cypher(cypher, { id: authenticatedUser.id })
        const dbUser = neode.hydrateFirst<typeof User>(result, 'u', neode.model('User'))
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

        const result2 = await neode.cypher(cypher, { id: authenticatedUser.id })
        const dbUser2 = neode.hydrateFirst(result2, 'u', neode.model('User'))
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
      authenticatedUser = undefined
    })

    it('throws an error', async () => {
      await expect(
        mutate({
          mutation: setTrophyBadgeSelected,
          variables: { slot: 0, badgeId: 'trophy_bear' },
        }),
      ).resolves.toEqual(
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
    beforeEach(async () => {
      authenticatedUser = undefined
    })

    it('throws an error', async () => {
      await expect(mutate({ mutation: resetTrophyBadgesSelected })).resolves.toEqual(
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

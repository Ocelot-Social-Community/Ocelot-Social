import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'
import { categories } from '../../constants/categories'

const categoryIds = ['cat9']
let user
let admin
let authenticatedUser

let query
let mutate
let variables

const driver = getDriver()
const neode = getNeode()

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

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
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

describe('save category settings', () => {
  beforeEach(async () => {
    await Promise.all(
      categories.map(({ icon, name }, index) => {
        Factory.build('category', {
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

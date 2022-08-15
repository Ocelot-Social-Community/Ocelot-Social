import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { createGroupMutation, groupQuery } from '../../db/graphql/groups'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'

const driver = getDriver()
const neode = getNeode()

let query
let mutate
let authenticatedUser
let user

const categoryIds = ['cat9', 'cat4', 'cat15']
const descriptionAdditional100 =
  ' 123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789-123456789'
let variables = {}

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
})

beforeEach(async () => {
  variables = {}
  user = await Factory.build(
    'user',
    {
      id: 'current-user',
      name: 'TestUser',
    },
    {
      email: 'test@example.org',
      password: '1234',
    },
  )
  await Promise.all([
    neode.create('Category', {
      id: 'cat9',
      name: 'Democracy & Politics',
      slug: 'democracy-politics',
      icon: 'university',
    }),
    neode.create('Category', {
      id: 'cat4',
      name: 'Environment & Nature',
      slug: 'environment-nature',
      icon: 'tree',
    }),
    neode.create('Category', {
      id: 'cat15',
      name: 'Consumption & Sustainability',
      slug: 'consumption-sustainability',
      icon: 'shopping-cart',
    }),
    neode.create('Category', {
      id: 'cat27',
      name: 'Animal Protection',
      slug: 'animal-protection',
      icon: 'paw',
    }),
  ])
  authenticatedUser = null
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('Group', () => {
  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      const { errors } = await query({ query: groupQuery, variables: {} })
      expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    let otherUser

    beforeEach(async () => {
      otherUser = await Factory.build(
        'user',
        {
          id: 'other-user',
          name: 'Other TestUser',
        },
        {
          email: 'test2@example.org',
          password: '1234',
        },
      )
      authenticatedUser = await otherUser.toJson()
      await mutate({
        mutation: createGroupMutation,
        variables: {
          id: 'others-group',
          name: 'Uninteresting Group',
          about: 'We will change nothing!',
          description: 'We love it like it is!?' + descriptionAdditional100,
          groupType: 'closed',
          actionRadius: 'global',
          categoryIds,
        },
      })
      authenticatedUser = await user.toJson()
      await mutate({
        mutation: createGroupMutation,
        variables: {
          id: 'my-group',
          name: 'The Best Group',
          about: 'We will change the world!',
          description: 'Some description' + descriptionAdditional100,
          groupType: 'public',
          actionRadius: 'regional',
          categoryIds,
        },
      })
    })

    describe('query groups', () => {
      describe('without any filters', () => {
        it('finds all groups', async () => {
          const expected = {
            data: {
              Group: expect.arrayContaining([
                expect.objectContaining({
                  id: 'my-group',
                  slug: 'the-best-group',
                  myRole: 'owner',
                }),
                expect.objectContaining({
                  id: 'others-group',
                  slug: 'uninteresting-group',
                  myRole: null,
                }),
              ]),
            },
            errors: undefined,
          }
          await expect(query({ query: groupQuery, variables: {} })).resolves.toMatchObject(expected)
        })
      })

      describe('isMember = true', () => {
        it('finds only groups where user is member', async () => {
          const expected = {
            data: {
              Group: [
                {
                  id: 'my-group',
                  slug: 'the-best-group',
                  myRole: 'owner',
                },
              ],
            },
            errors: undefined,
          }
          await expect(
            query({ query: groupQuery, variables: { isMember: true } }),
          ).resolves.toMatchObject(expected)
        })
      })

      describe('isMember = false', () => {
        it('finds only groups where user is not(!) member', async () => {
          const expected = {
            data: {
              Group: expect.arrayContaining([
                expect.objectContaining({
                  id: 'others-group',
                  slug: 'uninteresting-group',
                  myRole: null,
                }),
              ]),
            },
            errors: undefined,
          }
          await expect(
            query({ query: groupQuery, variables: { isMember: false } }),
          ).resolves.toMatchObject(expected)
        })
      })
    })
  })
})

describe('CreateGroup', () => {
  beforeEach(() => {
    variables = {
      ...variables,
      id: 'g589',
      name: 'The Best Group',
      slug: 'the-group',
      about: 'We will change the world!',
      description: 'Some description' + descriptionAdditional100,
      groupType: 'public',
      actionRadius: 'regional',
      categoryIds,
    }
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      const { errors } = await mutate({ mutation: createGroupMutation, variables })
      expect(errors[0]).toHaveProperty('message', 'Not Authorised!')
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      authenticatedUser = await user.toJson()
    })

    it('creates a group', async () => {
      const expected = {
        data: {
          CreateGroup: {
            name: 'The Best Group',
            slug: 'the-group',
            about: 'We will change the world!',
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('assigns the authenticated user as owner', async () => {
      const expected = {
        data: {
          CreateGroup: {
            name: 'The Best Group',
            myRole: 'owner',
          },
        },
        errors: undefined,
      }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    it('has "disabled" and "deleted" default to "false"', async () => {
      const expected = { data: { CreateGroup: { disabled: false, deleted: false } } }
      await expect(mutate({ mutation: createGroupMutation, variables })).resolves.toMatchObject(
        expected,
      )
    })

    describe('description', () => {
      describe('length without HTML', () => {
        describe('less then 100 chars', () => {
          it('throws error: "Too view categories!"', async () => {
            const { errors } = await mutate({
              mutation: createGroupMutation,
              variables: {
                ...variables,
                description:
                  '0123456789' +
                  '<a href="https://domain.org/0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789">0123456789</a>',
              },
            })
            expect(errors[0]).toHaveProperty('message', 'Description too short!')
          })
        })
      })
    })

    describe('categories', () => {
      describe('not even one', () => {
        it('throws error: "Too view categories!"', async () => {
          const { errors } = await mutate({
            mutation: createGroupMutation,
            variables: { ...variables, categoryIds: null },
          })
          expect(errors[0]).toHaveProperty('message', 'Too view categories!')
        })
      })

      describe('four', () => {
        it('throws error: "Too many categories!"', async () => {
          const { errors } = await mutate({
            mutation: createGroupMutation,
            variables: { ...variables, categoryIds: ['cat9', 'cat4', 'cat15', 'cat27'] },
          })
          expect(errors[0]).toHaveProperty('message', 'Too many categories!')
        })
      })
    })
  })
})

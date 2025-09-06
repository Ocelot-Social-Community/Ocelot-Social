/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import { Signup } from '@graphql/queries/Signup'
import { User } from '@graphql/queries/User'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let variables
let owner, anotherRegularUser, administrator, moderator

let authenticatedUser: Context['user']
let config: Partial<Context['config']>
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeEach(() => {
  config = { CATEGORIES_ACTIVE: true }
})

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

describe('authorization', () => {
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('given an owner, an other user, an admin, a moderator', () => {
    beforeEach(async () => {
      ;[owner, anotherRegularUser, administrator, moderator] = await Promise.all([
        Factory.build(
          'user',
          {
            name: 'Owner',
          },
          {
            email: 'owner@example.org',
            password: 'iamtheowner',
          },
        ),
        Factory.build(
          'user',
          {
            name: 'Another Regular User',
          },
          {
            email: 'another.regular.user@example.org',
            password: 'else',
          },
        ),
        Factory.build(
          'user',
          {
            name: 'Admin',
            role: 'admin',
          },
          {
            email: 'admin@example.org',
            password: 'admin',
          },
        ),
        Factory.build(
          'user',
          {
            name: 'Moderator',
            role: 'moderator',
          },
          {
            email: 'moderator@example.org',
            password: 'moderator',
          },
        ),
      ])
      variables = {}
    })

    describe('access email address', () => {
      describe('unauthenticated', () => {
        beforeEach(() => {
          authenticatedUser = null
        })

        it("throws an error and does not expose the owner's email address", async () => {
          await expect(query({ query: User, variables: { name: 'Owner' } })).resolves.toMatchObject(
            {
              errors: [{ message: 'Not Authorized!' }],
              data: { User: null },
            },
          )
        })
      })

      describe('authenticated', () => {
        describe('as the owner', () => {
          beforeEach(async () => {
            authenticatedUser = await owner.toJson()
          })

          it("exposes the owner's email address", async () => {
            variables = { name: 'Owner' }
            await expect(query({ query: User, variables })).resolves.toMatchObject({
              data: { User: [{ email: 'owner@example.org' }] },
              errors: undefined,
            })
          })
        })

        describe('as another regular user', () => {
          beforeEach(async () => {
            authenticatedUser = await anotherRegularUser.toJson()
          })

          it("throws an error and does not expose the owner's email address", async () => {
            await expect(
              query({ query: User, variables: { name: 'Owner' } }),
            ).resolves.toMatchObject({
              errors: [{ message: 'Not Authorized!' }],
              data: { User: [null] },
            })
          })
        })

        describe('as a moderator', () => {
          beforeEach(async () => {
            authenticatedUser = await moderator.toJson()
          })

          it("throws an error and does not expose the owner's email address", async () => {
            await expect(
              query({ query: User, variables: { name: 'Owner' } }),
            ).resolves.toMatchObject({
              errors: [{ message: 'Not Authorized!' }],
              data: { User: [null] },
            })
          })
        })

        describe('as an administrator', () => {
          beforeEach(async () => {
            authenticatedUser = await administrator.toJson()
          })

          it("exposes the owner's email address", async () => {
            variables = { name: 'Owner' }
            await expect(query({ query: User, variables })).resolves.toMatchObject({
              data: { User: [{ email: 'owner@example.org' }] },
              errors: undefined,
            })
          })
        })
      })
    })

    describe('access Signup', () => {
      describe('admin invite only', () => {
        beforeEach(async () => {
          variables = {
            email: 'some@email.org',
            inviteCode: 'ABCDEF',
            locale: 'de',
          }
          await Factory.build('inviteCode', {
            code: 'ABCDEF',
          })

          config = {
            ...config,
            CATEGORIES_ACTIVE: true,
            INVITE_REGISTRATION: false,
            PUBLIC_REGISTRATION: false,
          }
        })

        describe('as user', () => {
          beforeEach(async () => {
            authenticatedUser = await anotherRegularUser.toJson()
          })

          it('denies permission', async () => {
            await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
              errors: [{ message: 'Not Authorized!' }],
              data: { Signup: null },
            })
          })
        })

        describe('as admin', () => {
          beforeEach(async () => {
            authenticatedUser = await administrator.toJson()
          })

          it('returns an email', async () => {
            await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
              errors: undefined,
              data: {
                Signup: { email: 'some@email.org' },
              },
            })
          })
        })
      })

      describe('public registration', () => {
        beforeEach(async () => {
          variables = {
            email: 'some@email.org',
            inviteCode: 'ABCDEF',
            locale: 'de',
          }
          await Factory.build('inviteCode', {
            code: 'ABCDEF',
          })
          config = {
            ...config,
            CATEGORIES_ACTIVE: true,
            INVITE_REGISTRATION: false,
            PUBLIC_REGISTRATION: true,
          }
        })

        describe('as anyone', () => {
          beforeEach(() => {
            authenticatedUser = null
          })

          it('returns an email', async () => {
            await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
              errors: undefined,
              data: {
                Signup: { email: 'some@email.org' },
              },
            })
          })
        })
      })

      describe('invite registration', () => {
        beforeEach(async () => {
          await Factory.build('inviteCode', {
            code: 'ABCDEF',
          })
          config = {
            ...config,
            CATEGORIES_ACTIVE: true,
            INVITE_REGISTRATION: true,
            PUBLIC_REGISTRATION: false,
          }
        })

        describe('as anyone with valid invite code', () => {
          beforeEach(() => {
            variables = {
              email: 'some@email.org',
              inviteCode: 'ABCDEF',
              locale: 'de',
            }
            authenticatedUser = null
          })

          it('returns an email', async () => {
            await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
              errors: undefined,
              data: {
                Signup: { email: 'some@email.org' },
              },
            })
          })
        })

        describe('as anyone without valid invite', () => {
          beforeEach(() => {
            variables = {
              email: 'some@email.org',
              inviteCode: 'no valid invite code',
              locale: 'de',
            }
            authenticatedUser = null
          })

          it('denies permission', async () => {
            await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
              errors: [{ message: 'Not Authorized!' }],
              data: { Signup: null },
            })
          })
        })
      })
    })
  })
})

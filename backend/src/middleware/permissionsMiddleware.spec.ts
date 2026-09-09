/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, beforeAll, afterAll, describe, afterEach, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import Signup from '@graphql/queries/auth/Signup.gql'
import User from '@graphql/queries/users/User.gql'
import UserEmail from '@graphql/queries/users/UserEmail.gql'
import schema from '@graphql/schema'
import { createApolloTestSetup } from '@root/test/helpers'

import { groupCreatePermissionForType } from './permissionsMiddleware'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'
import type { GraphQLEnumType } from 'graphql'

let variables
let owner, anotherRegularUser, administrator, moderator

let authenticatedUser: Context['user']
let policy: Partial<NetworkPolicy>
const context = () => ({ authenticatedUser, policy })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeEach(() => {
  policy = { categoriesActive: true }
})

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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

            await expect(query({ query: UserEmail, variables })).resolves.toMatchObject({
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
              query({ query: UserEmail, variables: { name: 'Owner' } }),
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
              query({ query: UserEmail, variables: { name: 'Owner' } }),
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

            await expect(query({ query: UserEmail, variables })).resolves.toMatchObject({
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

          policy = {
            ...policy,
            categoriesActive: true,
            inviteRegistration: false,
            publicRegistration: false,
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
          policy = {
            ...policy,
            categoriesActive: true,
            inviteRegistration: false,
            publicRegistration: true,
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
          policy = {
            ...policy,
            categoriesActive: true,
            inviteRegistration: true,
            publicRegistration: false,
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

// Group creation is gated per TYPE, and the mapping from GroupType to permission is a hand-written
// switch. Its `default` arm exists for one situation only: a group type added to the schema and
// forgotten here — which must refuse creation rather than allow it unguarded. The enum currently
// has no such value, so the arm is unreachable through a request; asserting it against the LIVE
// schema enum is what turns it from an untested fallback into a checked invariant.
describe(groupCreatePermissionForType, () => {
  const groupTypes = (schema.getType('GroupType') as GraphQLEnumType)
    .getValues()
    .map((value) => value.name)

  it('covers every group type the schema offers', () => {
    expect(groupTypes.length).toBeGreaterThan(0)
    expect(
      groupTypes.filter((groupType) => groupCreatePermissionForType(groupType) === null),
    ).toEqual([])
  })

  it('maps each group type to its own permission', () => {
    // Distinct per type — a mapping that collapsed two types onto one permission would let a
    // member who may only create public groups create hidden ones.
    const permissions = groupTypes.map(groupCreatePermissionForType)

    expect(new Set(permissions).size).toBe(groupTypes.length)
  })

  it('refuses a group type it does not know', () => {
    expect(groupCreatePermissionForType('federated')).toBeNull()
  })
})

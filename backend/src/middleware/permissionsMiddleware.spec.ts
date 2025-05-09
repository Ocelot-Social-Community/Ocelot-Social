/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import CONFIG from '@config/index'
import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import createServer, { getContext } from '@src/server'

let variables
let owner, anotherRegularUser, administrator, moderator

const database = databaseContext()

let server: ApolloServer
let authenticatedUser
let query, mutate

beforeAll(async () => {
  await cleanDatabase()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await
  const contextUser = async (_req) => authenticatedUser
  const context = getContext({ user: contextUser, database })

  server = createServer({ context }).server

  const createTestClientResult = createTestClient(server)
  query = createTestClientResult.query
  mutate = createTestClientResult.mutate
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
      const userQuery = gql`
        query ($name: String) {
          User(name: $name) {
            email
          }
        }
      `

      describe('unauthenticated', () => {
        beforeEach(() => {
          authenticatedUser = null
        })

        it("throws an error and does not expose the owner's email address", async () => {
          await expect(
            query({ query: userQuery, variables: { name: 'Owner' } }),
          ).resolves.toMatchObject({
            errors: [{ message: 'Not Authorized!' }],
            data: { User: null },
          })
        })
      })

      describe('authenticated', () => {
        describe('as the owner', () => {
          beforeEach(async () => {
            authenticatedUser = await owner.toJson()
          })

          it("exposes the owner's email address", async () => {
            variables = { name: 'Owner' }
            await expect(query({ query: userQuery, variables })).resolves.toMatchObject({
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
              query({ query: userQuery, variables: { name: 'Owner' } }),
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
              query({ query: userQuery, variables: { name: 'Owner' } }),
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
            await expect(query({ query: userQuery, variables })).resolves.toMatchObject({
              data: { User: [{ email: 'owner@example.org' }] },
              errors: undefined,
            })
          })
        })
      })
    })

    describe('access Signup', () => {
      const signupMutation = gql`
        mutation ($email: String!, $locale: String!, $inviteCode: String) {
          Signup(email: $email, locale: $locale, inviteCode: $inviteCode) {
            email
          }
        }
      `

      describe('admin invite only', () => {
        beforeEach(async () => {
          variables = {
            email: 'some@email.org',
            inviteCode: 'ABCDEF',
            locale: 'de',
          }
          CONFIG.INVITE_REGISTRATION = false
          CONFIG.PUBLIC_REGISTRATION = false
          await Factory.build('inviteCode', {
            code: 'ABCDEF',
          })
        })

        describe('as user', () => {
          beforeEach(async () => {
            authenticatedUser = await anotherRegularUser.toJson()
          })

          it('denies permission', async () => {
            await expect(mutate({ mutation: signupMutation, variables })).resolves.toMatchObject({
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
            await expect(mutate({ mutation: signupMutation, variables })).resolves.toMatchObject({
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
          CONFIG.INVITE_REGISTRATION = false
          CONFIG.PUBLIC_REGISTRATION = true
          await Factory.build('inviteCode', {
            code: 'ABCDEF',
          })
        })

        describe('as anyone', () => {
          beforeEach(() => {
            authenticatedUser = null
          })

          it('returns an email', async () => {
            await expect(mutate({ mutation: signupMutation, variables })).resolves.toMatchObject({
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
          CONFIG.INVITE_REGISTRATION = true
          CONFIG.PUBLIC_REGISTRATION = false
          await Factory.build('inviteCode', {
            code: 'ABCDEF',
          })
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
            await expect(mutate({ mutation: signupMutation, variables })).resolves.toMatchObject({
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
            await expect(mutate({ mutation: signupMutation, variables })).resolves.toMatchObject({
              errors: [{ message: 'Not Authorized!' }],
              data: { Signup: null },
            })
          })
        })
      })
    })
  })
})

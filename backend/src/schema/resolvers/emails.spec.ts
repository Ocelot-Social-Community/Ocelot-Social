import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { getDriver, getNeode } from '../../db/neo4j'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'

const neode = getNeode()

let mutate, query
let authenticatedUser
let user
let variables
const driver = getDriver()

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
  mutate = createTestClient(server).mutate
  query = createTestClient(server).query
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

beforeEach(async () => {
  variables = {}
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('AddEmailAddress', () => {
  const mutation = gql`
    mutation ($email: String!) {
      AddEmailAddress(email: $email) {
        email
        verifiedAt
        createdAt
      }
    }
  `
  beforeEach(() => {
    variables = { ...variables, email: 'new-email@example.org' }
  })

  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws AuthorizationError', async () => {
      await expect(mutate({ mutation, variables })).resolves.toMatchObject({
        data: { AddEmailAddress: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      user = await Factory.build('user', { id: '567' }, { email: 'user@example.org' })
      authenticatedUser = await user.toJson()
    })

    describe('email attribute is not a valid email', () => {
      beforeEach(() => {
        variables = { ...variables, email: 'foobar' }
      })

      it('throws UserInputError', async () => {
        await expect(mutate({ mutation, variables })).resolves.toMatchObject({
          data: { AddEmailAddress: null },
          errors: [{ message: 'must be a valid email' }],
        })
      })
    })

    describe('email attribute is a valid email', () => {
      it('creates a new unverified `EmailAddress` node', async () => {
        await expect(mutate({ mutation, variables })).resolves.toMatchObject({
          data: {
            AddEmailAddress: {
              email: 'new-email@example.org',
              verifiedAt: null,
              createdAt: expect.any(String),
            },
          },
          errors: undefined,
        })
      })

      it('connects `UnverifiedEmailAddress` to the authenticated user', async () => {
        await mutate({ mutation, variables })
        const result = await neode.cypher(`
        MATCH(u:User)-[:PRIMARY_EMAIL]->(:EmailAddress {email: "user@example.org"})
        MATCH(u:User)<-[:BELONGS_TO]-(e:UnverifiedEmailAddress {email: "new-email@example.org"})
        RETURN e
      `)
        const email = neode.hydrateFirst(result, 'e', neode.model('UnverifiedEmailAddress'))
        await expect(email.toJson()).resolves.toMatchObject({
          email: 'new-email@example.org',
          nonce: expect.any(String),
        })
      })

      describe('if another `UnverifiedEmailAddress` node already exists with that email', () => {
        it('throws no unique constraint violation error', async () => {
          await Factory.build('unverifiedEmailAddress', {
            createdAt: '2019-09-24T14:00:01.565Z',
            email: 'new-email@example.org',
          })
          await expect(mutate({ mutation, variables })).resolves.toMatchObject({
            data: {
              AddEmailAddress: {
                email: 'new-email@example.org',
                verifiedAt: null,
              },
            },
            errors: undefined,
          })
        })
      })

      describe('but if another user owns an `EmailAddress` already with that email', () => {
        it('does not throw UserInputError', async () => {
          await Factory.build('user', {}, { email: 'new-email@example.org' })
          await expect(mutate({ mutation, variables })).resolves.toMatchObject({
            data: {
              AddEmailAddress: {
                createdAt: expect.any(String),
                verifiedAt: null,
                email: 'new-email@example.org',
              },
            },
            errors: undefined,
          })
        })
      })
    })
  })
})

describe('VerifyEmailAddress', () => {
  const mutation = gql`
    mutation ($email: String!, $nonce: String!) {
      VerifyEmailAddress(email: $email, nonce: $nonce) {
        email
        createdAt
        verifiedAt
      }
    }
  `

  beforeEach(() => {
    variables = { ...variables, email: 'to-be-verified@example.org', nonce: '12345' }
  })

  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws AuthorizationError', async () => {
      await expect(mutate({ mutation, variables })).resolves.toMatchObject({
        data: { VerifyEmailAddress: null },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      user = await Factory.build('user', { id: '567' }, { email: 'user@example.org' })
      authenticatedUser = await user.toJson()
    })

    describe('if no unverified `EmailAddress` node exists', () => {
      it('throws UserInputError', async () => {
        await expect(mutate({ mutation, variables })).resolves.toMatchObject({
          data: { VerifyEmailAddress: null },
          errors: [{ message: 'Invalid nonce or no email address found.' }],
        })
      })
    })

    describe('given a `UnverifiedEmailAddress`', () => {
      let emailAddress
      beforeEach(async () => {
        emailAddress = await Factory.build('unverifiedEmailAddress', {
          nonce: '12345',
          verifiedAt: null,
          createdAt: new Date().toISOString(),
          email: 'to-be-verified@example.org',
        })
      })

      describe('given invalid nonce', () => {
        it('throws UserInputError', async () => {
          variables.nonce = 'asdfgh'
          await expect(mutate({ mutation, variables })).resolves.toMatchObject({
            data: { VerifyEmailAddress: null },
            errors: [{ message: 'Invalid nonce or no email address found.' }],
          })
        })
      })

      describe('given valid nonce for `UnverifiedEmailAddress` node', () => {
        beforeEach(() => {
          variables = { ...variables, nonce: '12345' }
        })

        describe('but the address does not belong to the authenticated user', () => {
          it('throws UserInputError', async () => {
            await expect(mutate({ mutation, variables })).resolves.toMatchObject({
              data: { VerifyEmailAddress: null },
              errors: [{ message: 'Invalid nonce or no email address found.' }],
            })
          })
        })

        describe('and the `UnverifiedEmailAddress` belongs to the authenticated user', () => {
          beforeEach(async () => {
            await emailAddress.relateTo(user, 'belongsTo')
          })

          it('adds `verifiedAt`', async () => {
            await expect(mutate({ mutation, variables })).resolves.toMatchObject({
              data: {
                VerifyEmailAddress: {
                  email: 'to-be-verified@example.org',
                  verifiedAt: expect.any(String),
                  createdAt: expect.any(String),
                },
              },
              errors: undefined,
            })
          })

          it('connects the new `EmailAddress` as PRIMARY', async () => {
            await mutate({ mutation, variables })
            const result = await neode.cypher(`
            MATCH(u:User {id: "567"})-[:PRIMARY_EMAIL]->(e:EmailAddress {email: "to-be-verified@example.org"})
            RETURN e
          `)
            const email = neode.hydrateFirst(result, 'e', neode.model('EmailAddress'))
            await expect(email.toJson()).resolves.toMatchObject({
              email: 'to-be-verified@example.org',
            })
          })

          it('removes previous PRIMARY relationship', async () => {
            const cypherStatement = `
            MATCH(u:User {id: "567"})-[:PRIMARY_EMAIL]->(e:EmailAddress {email: "user@example.org"})
            RETURN e
          `
            let result = await neode.cypher(cypherStatement)
            let email = neode.hydrateFirst(result, 'e', neode.model('EmailAddress'))
            await expect(email.toJson()).resolves.toMatchObject({
              email: 'user@example.org',
            })
            await mutate({ mutation, variables })
            result = await neode.cypher(cypherStatement)
            email = neode.hydrateFirst(result, 'e', neode.model('EmailAddress'))
            await expect(email).toBe(false)
          })

          it('removes previous `EmailAddress` node', async () => {
            const cypherStatement = `
            MATCH(u:User {id: "567"})<-[:BELONGS_TO]-(e:EmailAddress {email: "user@example.org"})
            RETURN e
          `
            let result = await neode.cypher(cypherStatement)
            let email = neode.hydrateFirst(result, 'e', neode.model('EmailAddress'))
            await expect(email.toJson()).resolves.toMatchObject({
              email: 'user@example.org',
            })
            await mutate({ mutation, variables })
            result = await neode.cypher(cypherStatement)
            email = neode.hydrateFirst(result, 'e', neode.model('EmailAddress'))
            await expect(email).toBe(false)
          })

          describe('Edge case: In the meantime someone created an `EmailAddress` node with the given email', () => {
            beforeEach(async () => {
              await Factory.build('emailAddress', { email: 'to-be-verified@example.org' })
            })

            it('throws UserInputError because of unique constraints', async () => {
              await expect(mutate({ mutation, variables })).resolves.toMatchObject({
                data: { VerifyEmailAddress: null },
                errors: [{ message: 'A user account with this email already exists.' }],
              })
            })
          })
        })
      })
    })
  })
})

describe('VerifyNonce', () => {
  beforeEach(async () => {
    await Factory.build('emailAddress', {
      nonce: '12345',
      verifiedAt: null,
      createdAt: new Date().toISOString(),
      email: 'to-be-verified@example.org',
    })
  })

  const verifyNonceQuery = gql`
    query ($email: String!, $nonce: String!) {
      VerifyNonce(email: $email, nonce: $nonce)
    }
  `

  it('returns true when nonce and email match', async () => {
    variables = {
      email: 'to-be-verified@example.org',
      nonce: '12345',
    }
    await expect(query({ query: verifyNonceQuery, variables })).resolves.toMatchObject({
      data: { VerifyNonce: true },
    })
  })

  it('returns false when nonce and email do not match', async () => {
    variables = {
      email: 'to-be-verified@example.org',
      nonce: '---',
    }
    await expect(query({ query: verifyNonceQuery, variables })).resolves.toMatchObject({
      data: { VerifyNonce: false },
    })
  })
})

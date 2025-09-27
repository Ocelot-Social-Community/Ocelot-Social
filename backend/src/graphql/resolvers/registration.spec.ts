/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import EmailAddress from '@db/models/EmailAddress'
import User from '@db/models/User'
import { Signup } from '@graphql/queries/Signup'
import { SignupVerification } from '@graphql/queries/SignupVerification'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let variables

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let config: Partial<Context['config']> = {}

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(() => {
  config = {}
  variables = {}
})

afterEach(async () => {
  await cleanDatabase()
})

describe('Signup', () => {
  beforeEach(() => {
    variables = { ...variables, email: 'someuser@example.org', locale: 'de' }
  })

  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
      config = {
        INVITE_REGISTRATION: false,
        PUBLIC_REGISTRATION: false,
      }
    })

    it('throws AuthorizationError', async () => {
      await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
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

      it('is allowed to signup users by email', async () => {
        await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
          data: { Signup: { email: 'someuser@example.org' } },
          errors: undefined,
        })
      })

      describe('creates a EmailAddress node', () => {
        it('with `createdAt` attribute', async () => {
          await mutate({ mutation: Signup, variables })
          const emailAddress = await database.neode.first<typeof EmailAddress>(
            'EmailAddress',
            { email: 'someuser@example.org' },
            undefined,
          )
          const emailAddressJson = await emailAddress.toJson()
          expect(emailAddressJson.createdAt).toBeTruthy()
          expect(Date.parse(emailAddressJson.createdAt as unknown as string)).toEqual(
            expect.any(Number),
          )
        })

        it('with a cryptographic `nonce`', async () => {
          await mutate({ mutation: Signup, variables })
          const emailAddress = await database.neode.first<typeof EmailAddress>(
            'EmailAddress',
            { email: 'someuser@example.org' },
            undefined,
          )
          const emailAddressJson = await emailAddress.toJson()
          expect(emailAddressJson.nonce).toEqual(expect.any(String))
        })

        describe('if the email already exists', () => {
          let emailAddress
          beforeEach(async () => {
            emailAddress = await Factory.build('emailAddress', {
              email: 'someuser@example.org',
              verifiedAt: null,
            })
          })

          describe('and the user has registered already', () => {
            beforeEach(async () => {
              const user = await Factory.build('userWithoutEmailAddress')
              await emailAddress.relateTo(user, 'belongsTo')
            })

            it('does not throw UserInputError error', async () => {
              await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
                data: { Signup: { email: 'someuser@example.org' } },
              })
            })
          })

          describe('but the user has not yet registered', () => {
            it('resolves with the already existing email', async () => {
              await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
                data: { Signup: { email: 'someuser@example.org' } },
                errors: undefined,
              })
            })

            it('creates no additional `EmailAddress` node', async () => {
              // admin account and the already existing user
              await expect(database.neode.all('EmailAddress')).resolves.toHaveLength(2)
              await expect(mutate({ mutation: Signup, variables })).resolves.toMatchObject({
                data: { Signup: { email: 'someuser@example.org' } },
                errors: undefined,
              })
              await expect(database.neode.all('EmailAddress')).resolves.toHaveLength(2)
            })
          })
        })
      })
    })
  })
})

describe('SignupVerification', () => {
  describe('given valid password and email', () => {
    beforeEach(() => {
      variables = {
        ...variables,
        nonce: '12345',
        name: 'John Doe',
        password: '123',
        email: 'john@example.org',
        termsAndConditionsAgreedVersion: '0.1.0',
        locale: 'en',
      }
    })

    describe('unauthenticated', () => {
      beforeEach(() => {
        authenticatedUser = null
      })

      describe('EmailAddress exists, but is already related to a user account', () => {
        beforeEach(async () => {
          const { email, nonce } = variables
          const [emailAddress, user] = await Promise.all([
            database.neode.model('EmailAddress').create({ email, nonce }),
            database.neode
              .model('User')
              .create({ name: 'Somebody', password: '1234', email: 'john@example.org' }),
          ])
          await emailAddress.relateTo(user, 'belongsTo')
        })

        describe('sending a valid nonce', () => {
          beforeEach(() => {
            variables = { ...variables, nonce: '12345' }
          })

          it('rejects', async () => {
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              errors: [{ message: 'Invalid email or nonce' }],
            })
          })
        })
      })

      describe('disconnected EmailAddress exists', () => {
        beforeEach(async () => {
          const args = {
            email: 'john@example.org',
            nonce: '12345',
          }
          await database.neode.model('EmailAddress').create(args)
        })

        describe('sending a valid nonce', () => {
          it('creates a user account', async () => {
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              data: {
                SignupVerification: expect.objectContaining({
                  id: expect.any(String),
                }),
              },
            })
          })

          it('sets `verifiedAt` attribute of EmailAddress', async () => {
            await mutate({ mutation: SignupVerification, variables })
            const email = await database.neode.first(
              'EmailAddress',
              { email: 'john@example.org' },
              undefined,
            )
            await expect(email.toJson()).resolves.toEqual(
              expect.objectContaining({
                verifiedAt: expect.any(String),
              }),
            )
          })

          it('connects User with EmailAddress', async () => {
            const cypher = `
                MATCH(email:EmailAddress)-[:BELONGS_TO]->(u:User {name: $name})
                RETURN email
              `
            await mutate({ mutation: SignupVerification, variables })
            const { records: emails } = await database.neode.cypher(cypher, { name: 'John Doe' })
            expect(emails).toHaveLength(1)
          })

          it('sets `about` attribute of User', async () => {
            variables = { ...variables, about: 'Find this description in the user profile' }
            await mutate({ mutation: SignupVerification, variables })
            const user = await database.neode.first<typeof User>(
              'User',
              { name: 'John Doe' },
              undefined,
            )
            await expect(user.toJson()).resolves.toMatchObject({
              about: 'Find this description in the user profile',
            })
          })

          it('allowing the about field to be an empty string', async () => {
            variables = { ...variables, about: '' }
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              data: {
                SignupVerification: expect.objectContaining({
                  id: expect.any(String),
                }),
              },
            })
          })

          it('marks the EmailAddress as primary', async () => {
            const cypher = `
                MATCH(email:EmailAddress)<-[:PRIMARY_EMAIL]-(u:User {name: $name})
                RETURN email
              `
            await mutate({ mutation: SignupVerification, variables })
            const { records: emails } = await database.neode.cypher(cypher, { name: 'John Doe' })
            expect(emails).toHaveLength(1)
          })

          it('updates termsAndConditionsAgreedVersion', async () => {
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              data: {
                SignupVerification: expect.objectContaining({
                  termsAndConditionsAgreedVersion: '0.1.0',
                }),
              },
            })
          })

          it('updates termsAndConditionsAgreedAt', async () => {
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              data: {
                SignupVerification: expect.objectContaining({
                  termsAndConditionsAgreedAt: expect.any(String),
                }),
              },
            })
          })

          it('rejects if version of terms and conditions is missing', async () => {
            variables = { ...variables, termsAndConditionsAgreedVersion: null }
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              errors: [
                {
                  message:
                    'Variable "$termsAndConditionsAgreedVersion" of non-null type "String!" must not be null.',
                },
              ],
            })
          })

          it('rejects if version of terms and conditions has wrong format', async () => {
            variables = { ...variables, termsAndConditionsAgreedVersion: 'invalid version format' }
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              errors: [{ message: 'Invalid version format!' }],
            })
          })
        })

        describe('sending invalid nonce', () => {
          beforeEach(() => {
            variables = { ...variables, nonce: 'wut2' }
          })

          it('rejects', async () => {
            await expect(
              mutate({ mutation: SignupVerification, variables }),
            ).resolves.toMatchObject({
              errors: [{ message: 'Invalid email or nonce' }],
            })
          })
        })
      })
    })
  })
})

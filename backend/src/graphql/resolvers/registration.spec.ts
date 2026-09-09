/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import Signup from '@graphql/queries/auth/Signup.gql'
import SignupVerification from '@graphql/queries/auth/SignupVerification.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'

// SignupVerification.gql is the document the WEBAPP sends, and it passes neither `inviteCode`
// nor `locationName`. Both are part of the mutation the schema declares (and the signup form does
// send them), so the two arguments need a document of their own here.
const SignupVerificationWithExtras = `
  mutation (
    $password: String!
    $email: String!
    $name: String!
    $nonce: String!
    $termsAndConditionsAgreedVersion: String!
    $locale: String
    $inviteCode: String
    $locationName: String
  ) {
    SignupVerification(
      email: $email
      password: $password
      name: $name
      nonce: $nonce
      termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
      locale: $locale
      inviteCode: $inviteCode
      locationName: $locationName
    ) {
      id
    }
  }
`

let variables

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser, policy })
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let policy: Partial<NetworkPolicy> = {}

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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
  policy = {}
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
      policy = {
        inviteRegistration: false,
        publicRegistration: false,
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

      // Nothing above this resolver checks the address: `email: String!` only pins the type, and
      // existingEmailAddress just normalises and looks it up. The node declaration is the only
      // validation there is, and it runs BEFORE the write — an address that cannot receive the
      // verification nonce must not leave an EmailAddress node behind for it.
      it('refuses an address that is not one, and writes nothing', async () => {
        const { errors } = await mutate({
          mutation: Signup,
          variables: { ...variables, email: 'not-an-address' },
        })

        expect(errors?.[0].message).toContain('email')

        const { records } = await database.query({
          query: `MATCH (email:EmailAddress { email: 'not-an-address' }) RETURN count(email) AS count`,
        })

        expect(records[0].get('count').toNumber()).toBe(0)
      })

      describe('creates a EmailAddress node', () => {
        it('with `createdAt` attribute', async () => {
          await mutate({ mutation: Signup, variables })
          const emailAddress = await database.neode.first(
            'EmailAddress',
            { email: 'someuser@example.org' },
            undefined,
          )
          const emailAddressJson = await emailAddress.toJson()

          expect(emailAddressJson.createdAt).toBeTruthy()
          expect(Date.parse(emailAddressJson.createdAt as string)).toEqual(expect.any(Number))
        })

        it('with a cryptographic `nonce`', async () => {
          await mutate({ mutation: Signup, variables })
          const emailAddress = await database.neode.first(
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

          // The signup form submits an empty string for a location the user did not fill in, and
          // that is NOT a location named "". createOrUpdateLocations distinguishes the two by
          // reference: `undefined` means "leave it alone", `null` means "clear it", and only ''
          // arrives from the client — so without the normalisation every signup without a
          // location would forward '' to Mapbox and fail as an invalid locationName.
          it('accepts an empty locationName as "no location"', async () => {
            const { data, errors } = await mutate({
              mutation: SignupVerificationWithExtras,
              variables: { ...variables, locationName: '' },
            })

            expect(errors).toBeUndefined()
            expect(data.SignupVerification).toEqual(
              expect.objectContaining({ id: expect.any(String) }),
            )

            const { records } = await database.query({
              query: `MATCH (user:User { id: $id })
                      RETURN size([(user)-[:IS_IN]->(:Location) | 1]) AS locations`,
              variables: { id: data.SignupVerification.id },
            })

            expect(records[0].get('locations').toNumber()).toBe(0)
          })

          // The one caller that passes `newUser = true` to redeemInviteCode. Redeeming on signup
          // is what links the fresh account to whoever invited it — the mutual FOLLOWS and the
          // INVITED edge that the invite statistics count. Redeeming the same link from an
          // ALREADY registered account deliberately does none of that.
          it('redeems the invite code the account signed up with', async () => {
            const host = await Factory.build('user', { id: 'invite-host', name: 'Invite Host' })
            await database.write({
              query: `MATCH (host:User { id: 'invite-host' })
                      MERGE (host)-[:GENERATED]->(:InviteCode { code: 'SIGNUP' })`,
            })
            void host

            const { data, errors } = await mutate({
              mutation: SignupVerificationWithExtras,
              variables: { ...variables, inviteCode: 'SIGNUP' },
            })

            expect(errors).toBeUndefined()

            // BOTH follow directions, because the resolver writes both (inviteCodes.ts MERGEs
            // user→host and host→user) and "mutual" is the whole point: the invitee lands on a
            // populated feed, the host sees the account they brought in. Asserting one direction
            // would let the other silently go missing — and a half-followed pair looks fine from
            // whichever side happens to be checked first.
            const { records } = await database.query({
              query: `MATCH (host:User { id: 'invite-host' }), (user:User { id: $id })
                      RETURN exists((host)-[:INVITED]->(user)) AS invited,
                             exists((user)-[:REDEEMED]->(:InviteCode { code: 'SIGNUP' })) AS redeemed,
                             exists((user)-[:FOLLOWS]->(host)) AS followsHost,
                             exists((host)-[:FOLLOWS]->(user)) AS followedByHost`,
              variables: { id: data.SignupVerification.id },
            })

            expect(records[0].toObject()).toEqual({
              invited: true,
              redeemed: true,
              followsHost: true,
              followedByHost: true,
            })
          })

          it('fails hard and persists no user when the baseline "user" role is missing', async () => {
            // Simulate a misconfigured DB where role seeding never ran. The single-
            // role model needs exactly one HAS_ROLE edge, so signup must roll back
            // rather than create an edgeless, half-initialized account.
            await database.write({ query: `MATCH (r:Role {id: 'user'}) DETACH DELETE r` })

            const { data, errors } = await mutate({ mutation: SignupVerification, variables })

            // Assert the specific baseline-role failure (not just any error) and that
            // the mutation yielded no account — otherwise an unrelated error would let
            // this test pass and mask a regression.
            expect(errors).toEqual([
              expect.objectContaining({
                message: expect.stringContaining('baseline "user" role is not seeded'),
              }),
            ])
            expect(data?.SignupVerification ?? null).toBeNull()

            const { records } = await database.neode.cypher(
              `MATCH (u:User {name: $name}) RETURN u`,
              { name: 'John Doe' },
            )

            expect(records).toHaveLength(0)
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
            const user = await database.neode.first('User', { name: 'John Doe' }, undefined)

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

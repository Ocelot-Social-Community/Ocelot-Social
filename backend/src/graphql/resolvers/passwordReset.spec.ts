/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import gql from 'graphql-tag'

import registrationConstants from '@constants/registrationBranded'
import Factory, { cleanDatabase } from '@db/factories'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'

import createPasswordReset from './helpers/createPasswordReset'

let variables

let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const getAllPasswordResets = async () => {
  const passwordResetQuery = await database.neode.cypher(
    'MATCH (passwordReset:PasswordReset) RETURN passwordReset',
    {},
  )
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const resets = passwordResetQuery.records.map((record) => record.get('passwordReset'))
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return resets
}

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup()
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(() => {
  variables = {}
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('passwordReset', () => {
  describe('given a user', () => {
    beforeEach(async () => {
      await Factory.build(
        'user',
        {},
        {
          email: 'user@example.org',
        },
      )
    })

    describe('requestPasswordReset', () => {
      const mutation = gql`
        mutation ($email: String!, $locale: String!) {
          requestPasswordReset(email: $email, locale: $locale)
        }
      `

      describe('with invalid email', () => {
        beforeEach(() => {
          variables = { ...variables, email: 'non-existent@example.org', locale: 'de' }
        })

        it('resolves anyways', async () => {
          await expect(mutate({ mutation, variables })).resolves.toMatchObject({
            data: { requestPasswordReset: true },
          })
        })

        it('creates no node', async () => {
          await mutate({ mutation, variables })
          const resets = await getAllPasswordResets()
          expect(resets).toHaveLength(0)
        })
      })

      describe('with a valid email', () => {
        beforeEach(() => {
          variables = { ...variables, email: 'user@example.org', locale: 'de' }
        })

        it('resolves', async () => {
          await expect(mutate({ mutation, variables })).resolves.toMatchObject({
            data: { requestPasswordReset: true },
          })
        })

        it('creates node with label `PasswordReset`', async () => {
          let resets = await getAllPasswordResets()
          expect(resets).toHaveLength(0)
          await mutate({ mutation, variables })
          resets = await getAllPasswordResets()
          expect(resets).toHaveLength(1)
        })

        it('creates a reset nonce', async () => {
          await mutate({ mutation, variables })
          const resets = await getAllPasswordResets()
          const [reset] = resets
          const { nonce } = reset.properties
          expect(nonce).toHaveLength(registrationConstants.NONCE_LENGTH)
        })
      })
    })
  })
})

describe('resetPassword', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setup = async (options: any = {}) => {
    const { email = 'user@example.org', issuedAt = new Date(), nonce = '12345' } = options
    await createPasswordReset({ driver: database.driver, email, issuedAt, nonce })
  }

  const mutation = gql`
    mutation ($nonce: String!, $email: String!, $newPassword: String!) {
      resetPassword(nonce: $nonce, email: $email, newPassword: $newPassword)
    }
  `
  beforeEach(() => {
    variables = { ...variables, newPassword: 'supersecret' }
  })

  describe('given a user', () => {
    beforeEach(async () => {
      await Factory.build(
        'user',
        {
          role: 'user',
        },
        {
          email: 'user@example.org',
          password: '1234',
        },
      )
    })

    describe('invalid email', () => {
      it('resolves to false', async () => {
        await setup()
        variables = { ...variables, email: 'non-existent@example.org', nonce: '12345' }
        await expect(mutate({ mutation, variables })).resolves.toMatchObject({
          data: { resetPassword: false },
        })
      })
    })

    describe('valid email', () => {
      beforeEach(() => {
        variables = { ...variables, email: 'user@example.org' }
      })

      describe('but invalid nonce', () => {
        beforeEach(() => {
          variables = { ...variables, nonce: 'slkdj' }
        })

        it('resolves to false', async () => {
          await setup()
          await expect(mutate({ mutation, variables })).resolves.toMatchObject({
            data: { resetPassword: false },
          })
        })
      })

      describe('and valid nonce', () => {
        beforeEach(() => {
          variables = {
            ...variables,
            nonce: '12345',
          }
        })

        describe('and nonce not expired', () => {
          beforeEach(async () => {
            await setup()
          })

          it('resolves to true', async () => {
            await expect(mutate({ mutation, variables })).resolves.toMatchObject({
              data: { resetPassword: true },
            })
          })

          it('updates PasswordReset `usedAt` property', async () => {
            await mutate({ mutation, variables })
            const requests = await getAllPasswordResets()
            const [request] = requests
            const { usedAt } = request.properties
            expect(usedAt).not.toBeFalsy()
          })

          it('updates password of the user', async () => {
            await mutate({ mutation, variables })
            const checkLoginMutation = gql`
              mutation ($email: String!, $password: String!) {
                login(email: $email, password: $password)
              }
            `
            variables = { ...variables, email: 'user@example.org', password: 'supersecret' }
            await expect(
              mutate({ mutation: checkLoginMutation, variables }),
            ).resolves.toMatchObject({ data: { login: expect.any(String) } })
          })
        })

        describe('but expired nonce', () => {
          beforeEach(async () => {
            const issuedAt = new Date()
            issuedAt.setDate(issuedAt.getDate() - 1)
            await setup({ issuedAt })
          })

          it('resolves to false', async () => {
            await expect(mutate({ mutation, variables })).resolves.toMatchObject({
              data: { resetPassword: false },
            })
          })

          it('does not update PasswordReset `usedAt` property', async () => {
            await mutate({ mutation, variables })
            const requests = await getAllPasswordResets()
            const [request] = requests
            const { usedAt } = request.properties
            expect(usedAt).toBeUndefined()
          })
        })
      })
    })
  })
})

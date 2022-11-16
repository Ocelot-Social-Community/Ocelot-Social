import Factory, { cleanDatabase } from '../../db/factories'
import { gql } from '../../helpers/jest'
import { getNeode, getDriver } from '../../db/neo4j'
import CONSTANTS_REGISTRATION from './../../constants/registration'
import createPasswordReset from './helpers/createPasswordReset'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'

const neode = getNeode()
const driver = getDriver()

let mutate
let authenticatedUser
let variables

const getAllPasswordResets = async () => {
  const passwordResetQuery = await neode.cypher(
    'MATCH (passwordReset:PasswordReset) RETURN passwordReset',
  )
  const resets = passwordResetQuery.records.map((record) => record.get('passwordReset'))
  return resets
}

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
})

afterAll(async () => {
  await cleanDatabase()
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
        mutation ($email: String!) {
          requestPasswordReset(email: $email)
        }
      `

      describe('with invalid email', () => {
        beforeEach(() => {
          variables = { ...variables, email: 'non-existent@example.org' }
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
          variables = { ...variables, email: 'user@example.org' }
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
          expect(nonce).toHaveLength(CONSTANTS_REGISTRATION.NONCE_LENGTH)
        })
      })
    })
  })
})

describe('resetPassword', () => {
  const setup = async (options = {}) => {
    const { email = 'user@example.org', issuedAt = new Date(), nonce = '12345' } = options
    await createPasswordReset({ driver, email, issuedAt, nonce })
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

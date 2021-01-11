import Factory, { cleanDatabase } from '../../db/factories'
import { getDriver } from '../../db/neo4j'
import { gql } from '../../helpers/jest'
import createServer from '../../server'
import { createTestClient } from 'apollo-server-testing'

let user
// let query
let mutate

const driver = getDriver()

const generateInviteCodeMutation = gql`
  mutation($expiresAt: String = null) {
    GenerateInviteCode(expiresAt: $expiresAt) {
      code
      createdAt
      expiresAt
    }
  }
`

beforeAll(async () => {
  await cleanDatabase()
  const { server } = createServer({
    context: () => {
      return {
        driver,
        user,
      }
    },
  })
  //  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
})

describe('inviteCodes', () => {
  describe('generate invite code', () => {
    describe('as unauthenticated user', () => {
      it('returns permission denied error', async () => {
        await expect(mutate({ mutation: generateInviteCodeMutation })).resolves.toEqual(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                extensions: { code: 'INTERNAL_SERVER_ERROR' },
              }),
            ]),
            data: {
              GenerateInviteCode: null,
            },
          }),
        )
      })
    })

    describe('as authenticated user', () => {
      beforeAll(async () => {
        const authenticatedUser = await Factory.build(
          'user',
          {
            role: 'user',
          },
          {
            email: 'user@example.org',
            password: '1234',
          },
        )
        user = await authenticatedUser.toJson()
      })

      it('generates an invite code without expiresAt', async () => {
        await expect(mutate({ mutation: generateInviteCodeMutation })).resolves.toEqual(
          expect.objectContaining({
            errors: undefined,
            data: {
              GenerateInviteCode: {
                code: expect.stringMatching(/^[0-9A-Z]{6,6}$/),
                expiresAt: null,
                createdAt: expect.any(String),
              },
            },
          }),
        )
      })

      it('generates an invite code with expiresAt', async () => {
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        await expect(
          mutate({
            mutation: generateInviteCodeMutation,
            variables: { expiresAt: nextWeek.toISOString() },
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            errors: undefined,
            data: {
              GenerateInviteCode: {
                code: expect.stringMatching(/^[0-9A-Z]{6,6}$/),
                expiresAt: nextWeek.toISOString(),
                createdAt: expect.any(String),
              },
            },
          }),
        )
      })
    })
  })
})

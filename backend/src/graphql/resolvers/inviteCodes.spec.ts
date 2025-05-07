/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable security/detect-non-literal-regexp */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import registrationConstants from '@constants/registrationBranded'
import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import {
  authenticatedValidateInviteCode,
  unauthenticatedValidateInviteCode,
} from '@graphql/queries/validateInviteCode'
import createServer, { getContext } from '@src/server'

const generateInviteCodeMutation = gql`
  mutation ($expiresAt: String = null) {
    GenerateInviteCode(expiresAt: $expiresAt) {
      code
      createdAt
      expiresAt
    }
  }
`
const myInviteCodesQuery = gql`
  query {
    MyInviteCodes {
      code
      createdAt
      expiresAt
    }
  }
`
const isValidInviteCodeQuery = gql`
  query ($code: ID!) {
    isValidInviteCode(code: $code)
  }
`

const database = databaseContext()

let server: ApolloServer
let authenticatedUser
let query
let mutate

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

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe.only('validateInviteCode', () => {
  let invitingUser
  let personalInviteCode, expiredInviteCode

  beforeEach(async () => {
    await cleanDatabase()
    invitingUser = await Factory.build('user', {
      id: 'inviting-user',
      role: 'user',
      name: 'Inviting User',
    })
    expiredInviteCode = await Factory.build(
      'inviteCode',
      {
        code: 'EXPIRD',
        expiresAt: new Date(1970, 1).toISOString(),
      },
      {
        generatedBy: invitingUser,
      },
    )
    personalInviteCode = await Factory.build(
      'inviteCode',
      {
        code: 'PERSNL',
      },
      {
        generatedBy: invitingUser,
      },
    )
  })

  describe('as unauthenticated user', () => {
    beforeAll(() => {
      authenticatedUser = null
    })

    it('returns null when the code does not exist', async () => {
      await expect(
        query({ query: unauthenticatedValidateInviteCode, variables: { code: 'INVALD' } }),
      ).resolves.toEqual(
        expect.objectContaining({
          data: {
            validateInviteCode: null,
          },
          errors: undefined,
        }),
      )
    })

    it('returns null when the code is expired', async () => {
      await expect(
        query({ query: unauthenticatedValidateInviteCode, variables: { code: 'EXPIRD' } }),
      ).resolves.toEqual(
        expect.objectContaining({
          data: {
            validateInviteCode: null,
          },
          errors: undefined,
        }),
      )
    })

    it('returns the inviteCode when the code exists', async () => {
      await expect(
        query({ query: unauthenticatedValidateInviteCode, variables: { code: 'PERSNL' } }),
      ).resolves.toEqual(
        expect.objectContaining({
          data: {
            validateInviteCode: {
              code: 'PERSNL',
              generatedBy: {
                avatar: {
                  url: expect.any(String),
                },
                name: 'Inviting User',
              },
              invitedTo: null,
              isValid: true,
            },
          },
          errors: undefined,
        }),
      )
    })

    it('throws authorization error when querying extended fields', async () => {
      await expect(
        query({ query: authenticatedValidateInviteCode, variables: { code: 'PERSNL' } }),
      ).resolves.toMatchObject({
        data: {
          validateInviteCode: {
            code: 'PERSNL',
            generatedBy: null,
            invitedTo: null,
            isValid: true,
          },
        },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })
})

describe('inviteCodes', () => {
  describe('as unauthenticated user', () => {
    it('cannot generate invite codes', async () => {
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

    it('cannot query invite codes', async () => {
      await expect(query({ query: myInviteCodesQuery })).resolves.toEqual(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            }),
          ]),
          data: {
            MyInviteCodes: null,
          },
        }),
      )
    })
  })

  describe('as authenticated user', () => {
    beforeAll(async () => {
      const user = await Factory.build(
        'user',
        {
          role: 'user',
        },
        {
          email: 'user@example.org',
          password: '1234',
        },
      )
      authenticatedUser = await user.toJson()
    })

    it('generates an invite code without expiresAt', async () => {
      await expect(mutate({ mutation: generateInviteCodeMutation })).resolves.toEqual(
        expect.objectContaining({
          errors: undefined,
          data: {
            GenerateInviteCode: {
              code: expect.stringMatching(
                new RegExp(
                  `^[0-9A-Z]{${registrationConstants.INVITE_CODE_LENGTH},${registrationConstants.INVITE_CODE_LENGTH}}$`,
                ),
              ),
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
              code: expect.stringMatching(
                new RegExp(
                  `^[0-9A-Z]{${registrationConstants.INVITE_CODE_LENGTH},${registrationConstants.INVITE_CODE_LENGTH}}$`,
                ),
              ),
              expiresAt: nextWeek.toISOString(),
              createdAt: expect.any(String),
            },
          },
        }),
      )
    })

    let inviteCodes

    it('returns the created invite codes when queried', async () => {
      const response = await query({ query: myInviteCodesQuery })
      inviteCodes = response.data.MyInviteCodes
      expect(inviteCodes).toHaveLength(2)
    })

    it('does not return the created invite codes of other users when queried', async () => {
      await Factory.build('inviteCode')
      const response = await query({ query: myInviteCodesQuery })
      inviteCodes = response.data.MyInviteCodes
      expect(inviteCodes).toHaveLength(2)
    })

    it('validates an invite code without expiresAt', async () => {
      const unExpiringInviteCode = inviteCodes.filter((ic) => ic.expiresAt === null)[0].code
      const result = await query({
        query: isValidInviteCodeQuery,
        variables: { code: unExpiringInviteCode },
      })
      expect(result.data.isValidInviteCode).toBeTruthy()
    })

    it('validates an invite code in lower case', async () => {
      const unExpiringInviteCode = inviteCodes.filter((ic) => ic.expiresAt === null)[0].code
      const result = await query({
        query: isValidInviteCodeQuery,
        variables: { code: unExpiringInviteCode.toLowerCase() },
      })
      expect(result.data.isValidInviteCode).toBeTruthy()
    })

    it('validates an invite code with expiresAt in the future', async () => {
      const expiringInviteCode = inviteCodes.filter((ic) => ic.expiresAt !== null)[0].code
      const result = await query({
        query: isValidInviteCodeQuery,
        variables: { code: expiringInviteCode },
      })
      expect(result.data.isValidInviteCode).toBeTruthy()
    })

    it('does not validate an invite code which expired in the past', async () => {
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)
      const inviteCode = await Factory.build('inviteCode', {
        expiresAt: lastWeek.toISOString(),
      })
      const code = inviteCode.get('code')
      const result = await query({ query: isValidInviteCodeQuery, variables: { code } })
      expect(result.data.isValidInviteCode).toBeFalsy()
    })

    it('does not validate an invite code which does not exits', async () => {
      const result = await query({ query: isValidInviteCodeQuery, variables: { code: 'AAA' } })
      expect(result.data.isValidInviteCode).toBeFalsy()
    })
  })
})

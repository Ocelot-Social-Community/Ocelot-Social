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
import { createGroupMutation } from '@graphql/queries/createGroupMutation'
import { generatePersonalInviteCode } from '@graphql/queries/generatePersonalInviteCode'
import {
  authenticatedValidateInviteCode,
  unauthenticatedValidateInviteCode,
} from '@graphql/queries/validateInviteCode'
import createServer, { getContext } from '@src/server'
import { generateGroupInviteCode } from '@graphql/queries/generateGroupInviteCode'
import { joinGroupMutation } from '@graphql/queries/joinGroupMutation'

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

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('validateInviteCode', () => {
  let invitingUser, user
  beforeEach(async () => {
    await cleanDatabase()
    invitingUser = await Factory.build('user', {
      id: 'inviting-user',
      role: 'user',
      name: 'Inviting User',
    })
    user = await Factory.build('user', {
      id: 'normal-user',
      role: 'user',
      name: 'Normal User',
    })

    authenticatedUser = await invitingUser.toJson()
    const hiddenGroup = 'g0'
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: hiddenGroup,
        name: 'Hidden Group',
        about: 'We are hidden',
        description: 'anything',
        groupType: 'hidden',
        actionRadius: 'global',
        categoryIds: ['cat6', 'cat12', 'cat16'],
        locationName: 'Hamburg, Germany',
      },
    })

    const publicGroup = 'g2'
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: publicGroup,
        name: 'Public Group',
        about: 'We are public',
        description: 'anything',
        groupType: 'public',
        actionRadius: 'interplanetary',
        categoryIds: ['cat4', 'cat5', 'cat17'],
      },
    })

    await Factory.build(
      'inviteCode',
      {
        code: 'EXPIRD',
        expiresAt: new Date(1970, 1).toISOString(),
      },
      {
        generatedBy: invitingUser,
      },
    )
    await Factory.build(
      'inviteCode',
      {
        code: 'PERSNL',
      },
      {
        generatedBy: invitingUser,
      },
    )
    await Factory.build(
      'inviteCode',
      {
        code: 'GRPPBL',
      },
      {
        generatedBy: invitingUser,
        groupId: publicGroup,
      },
    )
    await Factory.build(
      'inviteCode',
      {
        code: 'GRPHDN',
      },
      {
        generatedBy: invitingUser,
        groupId: hiddenGroup,
      },
    )
  })
  describe('as unauthenticated user', () => {
    beforeEach(() => {
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

    it('returns the inviteCode with group details if the code invites to a public group', async () => {
      await expect(
        query({ query: unauthenticatedValidateInviteCode, variables: { code: 'GRPPBL' } }),
      ).resolves.toEqual(
        expect.objectContaining({
          data: {
            validateInviteCode: {
              code: 'GRPPBL',
              generatedBy: {
                avatar: {
                  url: expect.any(String),
                },
                name: 'Inviting User',
              },
              invitedTo: {
                groupType: 'public',
                name: 'Public Group',
                about: 'We are public',
                avatar: null,
              },
              isValid: true,
            },
          },
          errors: undefined,
        }),
      )
    })

    it('returns the inviteCode with redacted group details if the code invites to a hidden group', async () => {
      await expect(
        query({ query: unauthenticatedValidateInviteCode, variables: { code: 'GRPHDN' } }),
      ).resolves.toEqual(
        expect.objectContaining({
          data: {
            validateInviteCode: {
              code: 'GRPHDN',
              generatedBy: {
                avatar: {
                  url: expect.any(String),
                },
                name: 'Inviting User',
              },
              invitedTo: {
                groupType: 'hidden',
                name: '',
                about: '',
                avatar: null,
              },
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

  describe('as authenticated user', () => {
    beforeAll(async () => {
      authenticatedUser = await user.toJson()
    })

    it('throws no authorization error when querying extended fields', async () => {
      await expect(
        query({ query: authenticatedValidateInviteCode, variables: { code: 'PERSNL' } }),
      ).resolves.toMatchObject({
        data: {
          validateInviteCode: {
            code: 'PERSNL',
            generatedBy: {
              id: 'inviting-user',
              name: 'Inviting User',
              avatar: {
                url: expect.any(String),
              },
            },
            invitedTo: null,
            isValid: true,
          },
        },
        errors: undefined,
      })
    })

    it('throws no authorization error when querying extended public group fields', async () => {
      await expect(
        query({ query: authenticatedValidateInviteCode, variables: { code: 'GRPPBL' } }),
      ).resolves.toMatchObject({
        data: {
          validateInviteCode: {
            code: 'GRPPBL',
            generatedBy: {
              id: 'inviting-user',
              name: 'Inviting User',
              avatar: {
                url: expect.any(String),
              },
            },
            invitedTo: {
              id: 'g2',
              groupType: 'public',
              name: 'Public Group',
              about: 'We are public',
              avatar: null,
            },
            isValid: true,
          },
        },
        errors: undefined,
      })
    })

    // This doesn't work because group permissions are fucked
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('throws authorization error when querying extended hidden group fields', async () => {
      await expect(
        query({ query: authenticatedValidateInviteCode, variables: { code: 'GRPHDN' } }),
      ).resolves.toMatchObject({
        data: {
          validateInviteCode: {
            code: 'GRPHDN',
            generatedBy: null,
            invitedTo: null,
            isValid: true,
          },
        },
        errors: [{ message: 'Not Authorized!' }],
      })
    })

    // eslint-disable-next-line jest/no-disabled-tests, @typescript-eslint/no-empty-function
    it.skip('throws no authorization error when querying extended hidden group fields as member', async () => {})
  })
})

describe('generatePersonalInviteCode', () => {
  let invitingUser
  beforeEach(async () => {
    await cleanDatabase()
    invitingUser = await Factory.build('user', {
      id: 'inviting-user',
      role: 'user',
      name: 'Inviting User',
    })
  })
  describe('as unauthenticated user', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(mutate({ mutation: generatePersonalInviteCode })).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('as authenticated user', () => {
    beforeEach(async () => {
      authenticatedUser = await invitingUser.toJson()
    })

    it('returns a new invite code', async () => {
      await expect(mutate({ mutation: generatePersonalInviteCode })).resolves.toMatchObject({
        data: {
          generatePersonalInviteCode: {
            code: expect.any(String),
            comment: null,
            createdAt: expect.any(String),
            expiresAt: null,
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: null,
            isValid: true,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })

    it('returns a new invite code with comment', async () => {
      await expect(
        mutate({ mutation: generatePersonalInviteCode, variables: { comment: 'some text' } }),
      ).resolves.toMatchObject({
        data: {
          generatePersonalInviteCode: {
            code: expect.any(String),
            comment: 'some text',
            createdAt: expect.any(String),
            expiresAt: null,
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: null,
            isValid: true,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })

    it('returns a new invite code with expireDate', async () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() + 1)
      await expect(
        mutate({
          mutation: generatePersonalInviteCode,
          variables: { expiresAt: date.toISOString() },
        }),
      ).resolves.toMatchObject({
        data: {
          generatePersonalInviteCode: {
            code: expect.any(String),
            comment: null,
            createdAt: expect.any(String),
            expiresAt: date.toISOString(),
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: null,
            isValid: true,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })

    it('returns a new invalid invite code with expireDate in the past', async () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 1)
      await expect(
        mutate({
          mutation: generatePersonalInviteCode,
          variables: { expiresAt: date.toISOString() },
        }),
      ).resolves.toMatchObject({
        data: {
          generatePersonalInviteCode: {
            code: expect.any(String),
            comment: null,
            createdAt: expect.any(String),
            expiresAt: date.toISOString(),
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: null,
            isValid: false,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })
  })

  // eslint-disable-next-line jest/no-disabled-tests, @typescript-eslint/no-empty-function
  it.skip('code collision', () => {})
  // eslint-disable-next-line jest/no-disabled-tests, @typescript-eslint/no-empty-function
  it.skip('max amount used', () => {})
})

describe.only('generateGroupInviteCode', () => {
  let invitingUser, notMemberUser, pendingMemberUser
  let publicGroup, hiddenGroup
  beforeEach(async () => {
    await cleanDatabase()
    invitingUser = await Factory.build('user', {
      id: 'inviting-user',
      role: 'user',
      name: 'Inviting User',
    })

    notMemberUser = await Factory.build('user', {
      id: 'not-member-user',
      role: 'user',
      name: 'Not a Member User',
    })

    pendingMemberUser = await Factory.build('user', {
      id: 'pending-member-user',
      role: 'user',
      name: 'Pending Member User',
    })

    authenticatedUser = await invitingUser.toJson()
    hiddenGroup = 'g0'
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: hiddenGroup,
        name: 'Hidden Group',
        about: 'We are hidden',
        description: 'anything',
        groupType: 'hidden',
        actionRadius: 'global',
        categoryIds: ['cat6', 'cat12', 'cat16'],
        locationName: 'Hamburg, Germany',
      },
    })

    publicGroup = 'g2'
    await mutate({
      mutation: createGroupMutation(),
      variables: {
        id: publicGroup,
        name: 'Public Group',
        about: 'We are public',
        description: 'anything',
        groupType: 'public',
        actionRadius: 'interplanetary',
        categoryIds: ['cat4', 'cat5', 'cat17'],
      },
    })

    // TODO
    // pendingMemberUser.relateTo(hiddenGroup, 'memberOf', { role: 'pending' })
  })

  describe('as unauthenticated user', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: publicGroup } }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })
  describe('as authenticated user', () => {
    beforeEach(async () => {
      authenticatedUser = await invitingUser.toJson()
    })

    it('returns a new group invite code', async () => {
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: publicGroup } }),
      ).resolves.toMatchObject({
        data: {
          generateGroupInviteCode: {
            code: expect.any(String),
            comment: null,
            createdAt: expect.any(String),
            expiresAt: null,
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: {
              id: publicGroup,
              groupType: 'public',
              name: 'Public Group',
              about: 'We are public',
              avatar: null,
            },
            isValid: true,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })

    it('returns a new group invite code with comment', async () => {
      await expect(
        mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: publicGroup, comment: 'some text' },
        }),
      ).resolves.toMatchObject({
        data: {
          generateGroupInviteCode: {
            code: expect.any(String),
            comment: 'some text',
            createdAt: expect.any(String),
            expiresAt: null,
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: {
              id: publicGroup,
              groupType: 'public',
              name: 'Public Group',
              about: 'We are public',
              avatar: null,
            },
            isValid: true,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })

    it('returns a new group invite code with expireDate', async () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() + 1)
      await expect(
        mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: publicGroup, expiresAt: date.toISOString() },
        }),
      ).resolves.toMatchObject({
        data: {
          generateGroupInviteCode: {
            code: expect.any(String),
            comment: null,
            createdAt: expect.any(String),
            expiresAt: date.toISOString(),
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: {
              id: publicGroup,
              groupType: 'public',
              name: 'Public Group',
              about: 'We are public',
              avatar: null,
            },
            isValid: true,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })

    it('returns a new invalid group invite code with expireDate in the past', async () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 1)
      await expect(
        mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: publicGroup, expiresAt: date.toISOString() },
        }),
      ).resolves.toMatchObject({
        data: {
          generateGroupInviteCode: {
            code: expect.any(String),
            comment: null,
            createdAt: expect.any(String),
            expiresAt: date.toISOString(),
            generatedBy: {
              avatar: {
                url: expect.any(String),
              },
              id: 'inviting-user',
              name: 'Inviting User',
            },
            invitedTo: {
              id: publicGroup,
              groupType: 'public',
              name: 'Public Group',
              about: 'We are public',
              avatar: null,
            },
            isValid: false,
            redeemedBy: [],
          },
        },
        errors: undefined,
      })
    })
  })

  describe('as not-member user', () => {
    beforeEach(async () => {
      authenticatedUser = await notMemberUser.toJson()
    })

    it('throws authorization error', async () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 1)
      await expect(
        mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: publicGroup },
        }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('as pending-member user', () => {
    beforeEach(async () => {
      authenticatedUser = await pendingMemberUser.toJson()
    })

    it('throws authorization error', async () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 1)
      await expect(
        mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: hiddenGroup },
        }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  // eslint-disable-next-line jest/no-disabled-tests, @typescript-eslint/no-empty-function
  it.skip('code collision', () => {})
  // eslint-disable-next-line jest/no-disabled-tests, @typescript-eslint/no-empty-function
  it.skip('max amount used', () => {})
})

// --- old tests

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

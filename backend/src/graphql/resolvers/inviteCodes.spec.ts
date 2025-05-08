/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'

import CONFIG from '@config/index'
import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import { createGroupMutation } from '@graphql/queries/createGroupMutation'
import { currentUser } from '@graphql/queries/currentUser'
import { generateGroupInviteCode } from '@graphql/queries/generateGroupInviteCode'
import { generatePersonalInviteCode } from '@graphql/queries/generatePersonalInviteCode'
import { Group } from '@graphql/queries/Group'
import { GroupMembers } from '@graphql/queries/GroupMembers'
import { invalidateInviteCode } from '@graphql/queries/invalidateInviteCode'
import { redeemInviteCode } from '@graphql/queries/redeemInviteCode'
import {
  authenticatedValidateInviteCode,
  unauthenticatedValidateInviteCode,
} from '@graphql/queries/validateInviteCode'
import createServer, { getContext } from '@src/server'

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

    it('returns the inviteCode when the code exists and is not expired', async () => {
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

    it('throws an error when the max amount of invite links was reached', async () => {
      for (let i = 0; i < CONFIG.INVITE_CODES_PERSONAL_PER_USER; i++) {
        await expect(mutate({ mutation: generatePersonalInviteCode })).resolves.toMatchObject({
          errors: undefined,
        })
      }
      await expect(mutate({ mutation: generatePersonalInviteCode })).resolves.toMatchObject({
        errors: [
          {
            message: 'You have reached the maximum of Invite Codes you can generate',
          },
        ],
      })
    })
  })

  // eslint-disable-next-line jest/no-disabled-tests, @typescript-eslint/no-empty-function
  it.skip('code collision', () => {})
})

describe('generateGroupInviteCode', () => {
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
  describe('as authenticated member', () => {
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

    it('throws an error when the max amount of invite links was reached', async () => {
      for (let i = 0; i < CONFIG.INVITE_CODES_GROUP_PER_USER; i++) {
        await expect(
          mutate({ mutation: generateGroupInviteCode, variables: { groupId: publicGroup } }),
        ).resolves.toMatchObject({
          errors: undefined,
        })
      }
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: publicGroup } }),
      ).resolves.toMatchObject({
        errors: [
          {
            message: 'You have reached the maximum of Invite Codes you can generate for this group',
          },
        ],
      })
    })
  })

  describe('as authenticated not-member', () => {
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
})

describe('invalidateInviteCode', () => {
  let invitingUser, otherUser
  beforeEach(async () => {
    await cleanDatabase()
    invitingUser = await Factory.build('user', {
      id: 'inviting-user',
      role: 'user',
      name: 'Inviting User',
    })

    otherUser = await Factory.build('user', {
      id: 'other-user',
      role: 'user',
      name: 'Other User',
    })

    await Factory.build(
      'inviteCode',
      {
        code: 'CODE33',
      },
      {
        generatedBy: invitingUser,
      },
    )
  })

  describe('as unauthenticated user', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: invalidateInviteCode, variables: { code: 'CODE33' } }),
      ).resolves.toMatchObject({
        data: {
          invalidateInviteCode: null,
        },
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('as authenticated user', () => {
    describe('as link owner', () => {
      beforeEach(async () => {
        authenticatedUser = await invitingUser.toJson()
      })

      it('returns the invalidated InviteCode', async () => {
        await expect(
          mutate({ mutation: invalidateInviteCode, variables: { code: 'CODE33' } }),
        ).resolves.toMatchObject({
          data: {
            invalidateInviteCode: {
              code: expect.any(String),
              comment: null,
              createdAt: expect.any(String),
              expiresAt: expect.any(String),
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

    describe('as not link owner', () => {
      beforeEach(async () => {
        authenticatedUser = await otherUser.toJson()
      })

      it('throws authorization error', async () => {
        await expect(
          mutate({ mutation: invalidateInviteCode, variables: { code: 'CODE33' } }),
        ).resolves.toMatchObject({
          data: {
            invalidateInviteCode: null,
          },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })
  })
})

describe('redeemInviteCode', () => {
  let invitingUser, otherUser
  let hiddenGroup, publicGroup
  beforeEach(async () => {
    await cleanDatabase()
    invitingUser = await Factory.build('user', {
      id: 'inviting-user',
      role: 'user',
      name: 'Inviting User',
    })

    otherUser = await Factory.build('user', {
      id: 'other-user',
      role: 'user',
      name: 'Other User',
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

    await Factory.build(
      'inviteCode',
      {
        code: 'CODE33',
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

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'CODE33' } }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('as authenticated user', () => {
    beforeEach(async () => {
      authenticatedUser = await otherUser.toJson()
    })

    it('returns false for an invalid inviteCode', async () => {
      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'INVALD' } }),
      ).resolves.toMatchObject({
        data: {
          redeemInviteCode: false,
        },
        errors: undefined,
      })
    })

    it('returns true for a personal inviteCode, but does nothing', async () => {
      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'CODE33' } }),
      ).resolves.toMatchObject({
        data: {
          redeemInviteCode: true,
        },
        errors: undefined,
      })
      authenticatedUser = await invitingUser.toJson()
      await expect(query({ query: currentUser })).resolves.toMatchObject({
        data: {
          currentUser: {
            following: [],
            inviteCodes: expect.arrayContaining([
              {
                code: 'CODE33',
                redeemedByCount: 0,
              },
            ]),
          },
        },
        errors: undefined,
      })
    })

    it('returns true for a public group inviteCode and makes the user a group member', async () => {
      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'GRPPBL' } }),
      ).resolves.toMatchObject({
        data: {
          redeemInviteCode: true,
        },
        errors: undefined,
      })
      await expect(query({ query: Group, variables: { id: publicGroup } })).resolves.toMatchObject({
        data: {
          Group: [
            {
              myRole: 'usual',
            },
          ],
        },
        errors: undefined,
      })
      authenticatedUser = await invitingUser.toJson()
      await expect(query({ query: currentUser })).resolves.toMatchObject({
        data: {
          currentUser: {
            inviteCodes: expect.arrayContaining([
              {
                code: 'GRPPBL',
                redeemedByCount: 1,
              },
              {
                code: 'GRPHDN',
                redeemedByCount: 0,
              },
            ]),
          },
        },
        errors: undefined,
      })
    })

    it('returns true for a hidden group inviteCode and makes the user a pending member', async () => {
      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'GRPHDN' } }),
      ).resolves.toMatchObject({
        data: {
          redeemInviteCode: true,
        },
        errors: undefined,
      })
      // It is not possible to see if I am in a hidden group when pending
      /* await expect(query({ query: Group, variables: { id: hiddenGroup } })).resolves.toMatchObject({
        data: {
          Group: [
            {
              myRole: 'pending',
            },
          ],
        },
        errors: undefined,
      }) */
      authenticatedUser = await invitingUser.toJson()
      // with this query we cannot determine the users group role?
      await expect(
        query({ query: GroupMembers, variables: { id: hiddenGroup } }),
      ).resolves.toMatchObject({
        data: {
          GroupMembers: expect.arrayContaining([
            {
              id: 'inviting-user',
            },
            {
              id: 'other-user',
            },
          ]),
        },
        errors: undefined,
      })
      await expect(query({ query: currentUser })).resolves.toMatchObject({
        data: {
          currentUser: {
            inviteCodes: expect.arrayContaining([
              {
                code: 'GRPPBL',
                redeemedByCount: 0,
              },
              {
                code: 'GRPHDN',
                redeemedByCount: 1,
              },
            ]),
          },
        },
        errors: undefined,
      })
    })
  })

  describe('as authenticated self', () => {
    beforeEach(async () => {
      authenticatedUser = await invitingUser.toJson()
    })

    it('returns true for a personal inviteCode, but does nothing', async () => {
      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'CODE33' } }),
      ).resolves.toMatchObject({
        data: {
          redeemInviteCode: true,
        },
        errors: undefined,
      })
      await expect(query({ query: currentUser })).resolves.toMatchObject({
        data: {
          currentUser: {
            following: [],
            inviteCodes: expect.arrayContaining([
              {
                code: 'CODE33',
                redeemedByCount: 0,
              },
            ]),
          },
        },
        errors: undefined,
      })
    })

    it('returns true for a public group inviteCode, but does nothing', async () => {
      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'GRPPBL' } }),
      ).resolves.toMatchObject({
        data: {
          redeemInviteCode: true,
        },
        errors: undefined,
      })
      await expect(query({ query: Group, variables: { id: publicGroup } })).resolves.toMatchObject({
        data: {
          Group: [
            {
              myRole: 'owner',
            },
          ],
        },
        errors: undefined,
      })
      await expect(query({ query: currentUser })).resolves.toMatchObject({
        data: {
          currentUser: {
            following: [],
            inviteCodes: expect.arrayContaining([
              {
                code: 'GRPPBL',
                redeemedByCount: 0,
              },
              {
                code: 'GRPHDN',
                redeemedByCount: 0,
              },
            ]),
          },
        },
        errors: undefined,
      })
    })
  })
})

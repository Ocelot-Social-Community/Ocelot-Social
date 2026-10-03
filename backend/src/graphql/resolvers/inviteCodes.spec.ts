/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { beforeAll, afterAll, describe, beforeEach, it, expect, afterEach } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import currentUser from '@graphql/queries/auth/currentUser.gql'
import ChangeGroupMemberRole from '@graphql/queries/groups/ChangeGroupMemberRole.gql'
import CreateGroup from '@graphql/queries/groups/CreateGroup.gql'
import Group from '@graphql/queries/groups/Group.gql'
import GroupMembers from '@graphql/queries/groups/GroupMembers.gql'
import JoinGroup from '@graphql/queries/groups/JoinGroup.gql'
import authenticatedValidateInviteCode from '@graphql/queries/invites/authenticatedValidateInviteCode.gql'
import generateGroupInviteCode from '@graphql/queries/invites/generateGroupInviteCode.gql'
import generatePersonalInviteCode from '@graphql/queries/invites/generatePersonalInviteCode.gql'
import invalidateInviteCode from '@graphql/queries/invites/invalidateInviteCode.gql'
import redeemInviteCode from '@graphql/queries/invites/redeemInviteCode.gql'
import unauthenticatedValidateInviteCode from '@graphql/queries/invites/unauthenticatedValidateInviteCode.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { RoleDefinition } from '@src/role'

// The invite-code limits are network policy now; pin them explicitly so the
// "max reached" loops below are deterministic regardless of the schema default.
const INVITE_CODES_PERSONAL_PER_USER = 7
const INVITE_CODES_GROUP_PER_USER = 7

let authenticatedUser: Context['user']
// Per-test role override, for the one case where the network side reaches into a group.
let rolesOverride: RoleDefinition[] | undefined
// The network's own invite-registration switch. `group.invite.external` is gated by it, so
// turning it off has to take the external half of a group invite with it.
let inviteRegistration = true
const context = () => ({
  authenticatedUser,
  roles: rolesOverride,
  policy: {
    // user.invite is gated by inviteRegistration; pin it on so generatePersonalInviteCode
    // stays available here regardless of the schema default (the gate is unit-covered).
    inviteRegistration,
    inviteCodesPersonalPerUser: INVITE_CODES_PERSONAL_PER_USER,
    inviteCodesGroupPerUser: INVITE_CODES_GROUP_PER_USER,
  },
})
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
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
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'hidden-group',
        name: 'Hidden Group',
        about: 'We are hidden',
        description: 'anything',
        visibility: 'hidden',
        actionRadius: 'global',
        categoryIds: ['cat6', 'cat12', 'cat16'],
        locationName: 'Hamburg, Germany',
      },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'public-group',
        name: 'Public Group',
        about: 'We are public',
        description: 'anything',
        visibility: 'public',
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
        groupId: 'public-group',
      },
    )
    await Factory.build(
      'inviteCode',
      {
        code: 'GRPHDN',
      },
      {
        generatedBy: invitingUser,
        groupId: 'hidden-group',
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

    it('returns null when the code has expired', async () => {
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

    it('returns the inviteCode when the code exists and has not expired', async () => {
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
              allowsRegistration: true,
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
                visibility: 'public',
                name: 'Public Group',
                about: 'We are public',
                avatar: null,
              },
              isValid: true,
              // The owner issued it, so it carries group.invite.external and opens an account.
              allowsRegistration: true,
            },
          },
          errors: undefined,
        }),
      )
    })

    it('names the hidden group a code invites to, because holding the code is the entitlement', async () => {
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
              // Not blanked, although the viewer is logged out and the group is unlisted:
              // somebody in that group handed them this code, and the registration screen has
              // to be able to say what they are signing up for. Everything beyond name and
              // summary still follows `group.read`.
              invitedTo: {
                visibility: 'hidden',
                name: 'Hidden Group',
                about: 'We are hidden',
                avatar: null,
              },
              isValid: true,
              allowsRegistration: true,
            },
          },
          errors: undefined,
        }),
      )
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
              id: 'public-group',
              visibility: 'public',
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

    // Codes are six random characters, so collisions are rare but not impossible — and the
    // MERGE below would silently hand the second user the FIRST user's still-valid code,
    // letting them invite people in someone else's name. Forced here by pinning Math.random
    // so the first generated code is one that already exists.
    it('generates another code when the first one is already taken', async () => {
      await database.write({
        query: `MATCH (user:User { id: 'inviting-user' })
                MERGE (user)-[:GENERATED]->(:InviteCode { code: '000000' })`,
      })
      // Six draws per code (branding.registration.inviteCodeLength). 0 → '0', so the first
      // attempt reproduces the code above; 0.99 → 35 → 'Z' for every draw after that.
      let draw = 0
      const random = vi.spyOn(Math, 'random').mockImplementation(() => (draw++ < 6 ? 0 : 0.99))

      try {
        const { data, errors } = await mutate({ mutation: generatePersonalInviteCode })

        expect(errors).toBeUndefined()
        expect(data.generatePersonalInviteCode.code).toBe('ZZZZZZ')
      } finally {
        random.mockRestore()
      }
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
      let lastCode
      for (let i = 0; i < INVITE_CODES_PERSONAL_PER_USER; i++) {
        lastCode = await mutate({ mutation: generatePersonalInviteCode })

        expect(lastCode).toMatchObject({
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

      await mutate({
        mutation: invalidateInviteCode,
        variables: { code: lastCode.data.generatePersonalInviteCode.code },
      })

      await expect(mutate({ mutation: generatePersonalInviteCode })).resolves.toMatchObject({
        errors: undefined,
      })
    })
  })
})

describe('generateGroupInviteCode', () => {
  let invitingUser, notMemberUser, pendingMemberUser, usualMemberUser

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

    usualMemberUser = await Factory.build('user', {
      id: 'usual-member-user',
      role: 'user',
      name: 'Usual Member User',
    })

    authenticatedUser = await invitingUser.toJson()
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'hidden-group',
        name: 'Hidden Group',
        about: 'We are hidden',
        description: 'anything',
        visibility: 'hidden',
        actionRadius: 'global',
        categoryIds: ['cat6', 'cat12', 'cat16'],
        locationName: 'Hamburg, Germany',
      },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'public-group',
        name: 'Public Group',
        about: 'We are public',
        description: 'anything',
        visibility: 'public',
        actionRadius: 'interplanetary',
        categoryIds: ['cat4', 'cat5', 'cat17'],
      },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'closed-group',
        name: 'Closed Group',
        about: 'We are closed',
        description: 'anything',
        visibility: 'closed',
        actionRadius: 'interplanetary',
        categoryIds: ['cat4', 'cat5', 'cat17'],
      },
    })

    await mutate({
      mutation: JoinGroup,
      variables: {
        groupId: 'closed-group',
        userId: 'pending-member-user',
      },
    })
  })

  describe('as unauthenticated user', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'public-group' } }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  // The cases below are the ones that were missing while the guard passed everyone: only the
  // unauthenticated path was covered, and that one is short-circuited before the query runs.
  describe('as a user who is not a member of the group', () => {
    beforeEach(async () => {
      authenticatedUser = await notMemberUser.toJson()
    })

    it.each(['public-group', 'closed-group', 'hidden-group'])(
      'throws authorization error for the %s',
      async (groupId) => {
        await expect(
          mutate({ mutation: generateGroupInviteCode, variables: { groupId } }),
        ).resolves.toMatchObject({
          data: null,
          errors: [{ message: 'Not Authorized!' }],
        })
      },
    )
  })

  describe('as a network administrator who is not a member', () => {
    beforeEach(async () => {
      // `group.administer.any_public` folds the whole group catalog in, so the shield lets the
      // request through on the strength of a network right alone.
      rolesOverride = [
        { name: 'user', protected: false, permissions: ['group.administer.any_public'] },
      ] as RoleDefinition[]
      authenticatedUser = await notMemberUser.toJson()
    })

    afterEach(() => {
      rolesOverride = undefined
    })

    it('still cannot hand out an invite code for a group it is not in', async () => {
      // The code is issued BY a member: it hangs off their GENERATED edge and counts against
      // their per-group quota. The recovery path (concept E16) promotes existing members, it
      // does not turn a network admin into one — so the statement finds no membership and the
      // resolver refuses rather than creating a code nobody in the group handed out.
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'public-group' } }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('as a pending member', () => {
    beforeEach(async () => {
      authenticatedUser = await pendingMemberUser.toJson()
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'closed-group' } }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('while the network has invite registration switched off', () => {
    // Restored here rather than at the end of the test body, so a failing expectation cannot
    // leave the switch off for everything that follows.
    afterEach(() => {
      inviteRegistration = true
    })

    it('leaves the group invite usable but strips its external half', async () => {
      // `group.invite.external` is gated by the `inviteRegistration` policy (E11): a network
      // that does not let people register by invitation must not be undercut through groups.
      // The group invite itself keeps working — it brings existing accounts in.
      inviteRegistration = false
      authenticatedUser = await invitingUser.toJson()

      const { data, errors } = await mutate({
        mutation: generateGroupInviteCode,
        variables: { groupId: 'public-group' },
      })

      expect(errors).toBeUndefined()
      expect(data.generateGroupInviteCode).toMatchObject({
        isValid: true,
        allowsRegistration: false,
      })
    })
  })

  describe('as a usual member', () => {
    beforeEach(async () => {
      // Joining is done by the owner on behalf of the member, as in the setup above. A closed
      // group admits everyone as `pending`, so the owner promotes them to a full member.
      authenticatedUser = await invitingUser.toJson()
      await mutate({
        mutation: JoinGroup,
        variables: { groupId: 'public-group', userId: 'usual-member-user' },
      })
      await mutate({
        mutation: JoinGroup,
        variables: { groupId: 'closed-group', userId: 'usual-member-user' },
      })
      await mutate({
        mutation: ChangeGroupMemberRole,
        variables: {
          groupId: 'closed-group',
          userId: 'usual-member-user',
          roleInGroup: 'usual',
        },
      })
      authenticatedUser = await usualMemberUser.toJson()
    })

    it('generates a code for the public group', async () => {
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'public-group' } }),
      ).resolves.toMatchObject({
        data: { generateGroupInviteCode: { code: expect.any(String) } },
        errors: undefined,
      })
    })

    it('generates a code that is valid but does not open an account', async () => {
      // A member of a public group holds `group.invite`, not `group.invite.external` (E11):
      // their link brings people who already have an account into the group. That is a
      // perfectly usable code — it used to be reported as invalid, because `isValid` asked
      // the registration question instead of the redemption one.
      const { data, errors } = await mutate({
        mutation: generateGroupInviteCode,
        variables: { groupId: 'public-group' },
      })

      expect(errors).toBeUndefined()
      expect(data.generateGroupInviteCode).toMatchObject({
        isValid: true,
        allowsRegistration: false,
      })
    })

    it('throws authorization error for the closed group, where only admins invite', async () => {
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'closed-group' } }),
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

    // Same collision retry as generatePersonalInviteCode — a separate loop in the resolver, so a
    // fix applied to only one of them would leave this one handing out a taken code.
    it('generates another code when the first one is already taken', async () => {
      await database.write({
        query: `MATCH (user:User { id: 'inviting-user' })
                MERGE (user)-[:GENERATED]->(:InviteCode { code: '000000' })`,
      })
      let draw = 0
      const random = vi.spyOn(Math, 'random').mockImplementation(() => (draw++ < 6 ? 0 : 0.99))

      try {
        const { data, errors } = await mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: 'public-group' },
        })

        expect(errors).toBeUndefined()
        expect(data.generateGroupInviteCode.code).toBe('ZZZZZZ')
      } finally {
        random.mockRestore()
      }
    })

    it('returns a new group invite code', async () => {
      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'public-group' } }),
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
              id: 'public-group',
              visibility: 'public',
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
          variables: { groupId: 'public-group', comment: 'some text' },
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
              id: 'public-group',
              visibility: 'public',
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
          variables: { groupId: 'public-group', expiresAt: date.toISOString() },
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
              id: 'public-group',
              visibility: 'public',
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
          variables: { groupId: 'public-group', expiresAt: date.toISOString() },
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
              id: 'public-group',
              visibility: 'public',
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
      let lastCode
      for (let i = 0; i < INVITE_CODES_GROUP_PER_USER; i++) {
        lastCode = await mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: 'public-group' },
        })

        expect(lastCode).toMatchObject({
          errors: undefined,
        })
      }

      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'public-group' } }),
      ).resolves.toMatchObject({
        errors: [
          {
            message: 'You have reached the maximum of Invite Codes you can generate for this group',
          },
        ],
      })

      await mutate({
        mutation: invalidateInviteCode,
        variables: { code: lastCode.data.generateGroupInviteCode.code },
      })

      await expect(
        mutate({ mutation: generateGroupInviteCode, variables: { groupId: 'public-group' } }),
      ).resolves.toMatchObject({
        errors: undefined,
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
          variables: { groupId: 'public-group' },
        }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('as pending-member user', () => {
    beforeEach(async () => {
      authenticatedUser = await pendingMemberUser.toJson()
    })

    it('throws authorization error', async () => {
      await expect(
        mutate({
          mutation: generateGroupInviteCode,
          variables: { groupId: 'hidden-group' },
        }),
      ).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })
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
    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'hidden-group',
        name: 'Hidden Group',
        about: 'We are hidden',
        description: 'anything',
        visibility: 'hidden',
        actionRadius: 'global',
        categoryIds: ['cat6', 'cat12', 'cat16'],
        locationName: 'Hamburg, Germany',
      },
    })

    await mutate({
      mutation: CreateGroup,
      variables: {
        id: 'public-group',
        name: 'Public Group',
        about: 'We are public',
        description: 'anything',
        visibility: 'public',
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
        groupId: 'public-group',
      },
    )
    await Factory.build(
      'inviteCode',
      {
        code: 'GRPHDN',
      },
      {
        generatedBy: invitingUser,
        groupId: 'hidden-group',
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
            inviteCodes: [
              {
                code: 'CODE33',
                redeemedByCount: 0,
              },
            ],
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
      await expect(
        query({ query: Group, variables: { id: 'public-group' } }),
      ).resolves.toMatchObject({
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

      await expect(query({ query: Group })).resolves.toMatchObject({
        data: {
          Group: expect.arrayContaining([
            expect.objectContaining({
              inviteCodes: expect.arrayContaining([
                {
                  code: 'GRPPBL',
                  redeemedByCount: 1,
                },
              ]),
            }),
          ]),
        },
        errors: undefined,
      })
    })

    it('returns true for a hidden group inviteCode and makes the user a MEMBER', async () => {
      // Changed deliberately: an invitation IS the approval. An unlisted group grants no join
      // right, so landing the invitee as an applicant left them holding nothing but
      // `group.leave` — able to leave something they could not see, waiting for an approval
      // from the person who had just invited them.

      await expect(
        mutate({ mutation: redeemInviteCode, variables: { code: 'GRPHDN' } }),
      ).resolves.toMatchObject({
        data: {
          redeemInviteCode: true,
        },
        errors: undefined,
      })

      authenticatedUser = await invitingUser.toJson()

      await expect(
        query({ query: GroupMembers, variables: { id: 'hidden-group', includePending: true } }),
      ).resolves.toMatchObject({
        data: {
          GroupMembers: expect.arrayContaining([
            {
              user: {
                id: 'inviting-user',
                name: 'Inviting User',
                slug: 'inviting-user',
              },
              membership: {
                role: 'owner',
              },
            },
            {
              user: {
                id: 'other-user',
                name: 'Other User',
                slug: 'other-user',
              },
              membership: {
                role: 'usual',
              },
            },
          ]),
        },
        errors: undefined,
      })
      await expect(query({ query: Group })).resolves.toMatchObject({
        data: {
          Group: expect.arrayContaining([
            expect.objectContaining({
              inviteCodes: expect.arrayContaining([
                {
                  code: 'GRPHDN',
                  redeemedByCount: 1,
                },
              ]),
            }),
          ]),
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
            inviteCodes: [
              {
                code: 'CODE33',
                redeemedByCount: 0,
              },
            ],
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
      await expect(
        query({ query: Group, variables: { id: 'public-group' } }),
      ).resolves.toMatchObject({
        data: {
          Group: [
            {
              myRole: 'owner',
            },
          ],
        },
        errors: undefined,
      })
      await expect(query({ query: Group })).resolves.toMatchObject({
        data: {
          Group: expect.arrayContaining([
            expect.objectContaining({
              inviteCodes: expect.arrayContaining([
                {
                  code: 'GRPPBL',
                  redeemedByCount: 0,
                },
              ]),
            }),
          ]),
        },
        errors: undefined,
      })
    })
  })
})

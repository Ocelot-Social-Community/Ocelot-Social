/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'
import { branding } from '@src/branding'
import { PENDING_ROLE, USUAL_ROLE } from '@src/groupRole'

import Resolver from './helpers/Resolver'

import type { Context } from '@src/context'

export const generateInviteCode = () => {
  // branding.registration.inviteCodeLength random numbers, each in [ 0, 35 ] → 36 possibilities
  // (10 [0-9] + 26 [A-Z])
  return Array.from(
    { length: branding.registration.inviteCodeLength },
    // eslint-disable-next-line @typescript-eslint/no-useless-default-assignment
    (n: number = Math.floor(Math.random() * 36)) => {
      // n > 9: it is a letter (ASCII 65 is A) -> 10 + 55 = 65
      // else: it is a number (ASCII 48 is 0) -> 0 + 48 = 48
      return String.fromCharCode(n > 9 ? n + 55 : n + 48)
    },
  ).join('')
}

const uniqueInviteCode = async (context: Context, code: string) => {
  return (
    (
      await context.database.query({
        query: `MATCH (inviteCode:InviteCode { code: toUpper($code) })
        WHERE inviteCode.expiresAt IS NULL
          OR inviteCode.expiresAt >= datetime()
        RETURN toString(count(inviteCode)) AS count`,
        variables: { code },
      })
    ).records[0].get('count') === '0'
  )
}

/**
 * Two different questions about one code, which used to be the same function — and that is
 * what made a perfectly usable invite link show up under "expired".
 *
 *  - REDEEMABLE: does this code still exist and has it not run out? That is what `isValid`
 *    answers, and what the invite list sorts by.
 *  - ALLOWS REGISTRATION: may somebody create an ACCOUNT with it? A group code whose issuer
 *    holds `group.invite` but not `group.invite.external` may not (E11) — it still brings
 *    somebody who already has an account into the group, which is the whole point of it.
 *
 * `coalesce(externalAllowed, true)` covers every code handed out before the two rights were
 * split, and every personal code: those have always entitled their holder to register.
 */
const inviteCodeState = async (
  context: Context,
  inviteCode: string,
): Promise<{ redeemable: boolean; allowsRegistration: boolean }> => {
  const result = (
    await context.database.query({
      query: `
      OPTIONAL MATCH (inviteCode:InviteCode { code: toUpper($inviteCode) })
      WITH inviteCode,
        CASE
        WHEN inviteCode IS NULL THEN false
        WHEN inviteCode.expiresAt IS NULL THEN true
        WHEN datetime(inviteCode.expiresAt) >= datetime() THEN true
        ELSE false END AS redeemable
      RETURN redeemable,
             redeemable AND coalesce(inviteCode.externalAllowed, true) AS allowsRegistration
      `,
      variables: { inviteCode },
    })
  ).records
  const record = result[0]
  return {
    redeemable: record?.get('redeemable') === true,
    allowsRegistration: record?.get('allowsRegistration') === true,
  }
}

/** Whether the code can still be redeemed at all — not whether one may register with it. */
export const isInviteCodeRedeemable = async (
  context: Context,
  inviteCode: string,
): Promise<boolean> => (await inviteCodeState(context, inviteCode)).redeemable

/**
 * Whether somebody may create an account with this code. The registration gate asks this one
 * (see the `inviteRegistration` shield rule), and so does the registration screen.
 */
export const inviteCodeAllowsRegistration = async (
  context: Context,
  inviteCode: string,
): Promise<boolean> => (await inviteCodeState(context, inviteCode)).allowsRegistration

export const redeemInviteCode = async (context: Context, code, newUser = false) => {
  if (!context.user) {
    throw new Error('Missing authenticated user.')
  }
  const result = (
    await context.database.query({
      query: `
      MATCH (inviteCode:InviteCode {code: toUpper($code)})<-[:GENERATED]-(host:User)
      OPTIONAL MATCH (inviteCode)-[:INVITES_TO]->(group:Group)
      WHERE inviteCode.expiresAt IS NULL
        OR datetime(inviteCode.expiresAt) >= datetime()
      RETURN inviteCode {.*}, group {.*}, host {.*}`,
      variables: { code },
    })
  ).records

  if (result.length !== 1) {
    return false
  }

  const inviteCode = result[0].get('inviteCode')
  const group = result[0].get('group')
  const host = result[0].get('host')

  if (!inviteCode || !host) {
    return false
  }

  // self
  if (host.id === context.user.id) {
    return true
  }

  // Personal Invite Link
  if (!group) {
    // We redeemed this link while having an account, hence we do nothing, but return true
    if (!newUser) {
      return true
    }

    await context.database.write({
      query: `
      MATCH (user:User {id: $user.id}), (inviteCode:InviteCode {code: toUpper($code)})<-[:GENERATED]-(host:User)
      MERGE (user)-[:REDEEMED { createdAt: toString(datetime()) }]->(inviteCode)
      MERGE (host)-[:INVITED { createdAt: toString(datetime()) }]->(user)
      MERGE (user)-[:FOLLOWS { createdAt: toString(datetime()) }]->(host)
      MERGE (host)-[:FOLLOWS { createdAt: toString(datetime()) }]->(user)
      `,
      variables: { user: context.user, code },
    })
    // Group Invite Link
  } else {
    // An invitation IS the approval, so an invited person lands as a MEMBER — whatever the
    // group's door says about strangers.
    //
    // This used to read the door (`group.join` on the non-member role) exactly as JoinGroup
    // does, which produced a dead end in the one group where an invitation is the ONLY way in:
    // an unlisted group grants no join right, so the invitee became an applicant holding
    // nothing but `group.leave` — able to leave something they could not see, and waiting for
    // an approval from somebody who had already given it by inviting them.
    //
    // The door answers "may a stranger let themselves in". That question does not arise here:
    // somebody who holds `group.invite` has already decided, and the two rights the door is
    // made of say nothing about people who were asked to come.
    //
    // A deliberate behaviour change (#10356-era review): the `pending` role now only does
    // anything in a group that asks to be asked, which is the `closed` preset.
    const role = USUAL_ROLE

    const optionalInvited = newUser
      ? 'MERGE (host)-[:INVITED { createdAt: toString(datetime()) }]->(user)'
      : ''

    await context.database.write({
      query: `
      MATCH (user:User {id: $user.id}), (group:Group)<-[:INVITES_TO]-(inviteCode:InviteCode {code: toUpper($code)})<-[:GENERATED]-(host:User)
      MERGE (user)-[:REDEEMED { createdAt: toString(datetime()) }]->(inviteCode)
      ${optionalInvited}
      MERGE (user)-[membership:MEMBER_OF]->(group)
        ON CREATE SET
          membership.createdAt = toString(datetime()),
          membership.updatedAt = toString(datetime()),
          membership.role = $role
        // Somebody who had already asked to join is let in by the invitation, which is the
        // approval they were waiting for. Only pending moves: a member or an admin
        // redeeming a code to their own group keeps the role they have.
        ON MATCH SET
          membership.updatedAt = CASE
            WHEN membership.role = $pendingRole THEN toString(datetime())
            ELSE membership.updatedAt
          END,
          membership.role = CASE
            WHEN membership.role = $pendingRole THEN $role
            ELSE membership.role
          END
      `,
      variables: { user: context.user, code, role, pendingRole: PENDING_ROLE },
    })
  }
  return true
}

export default {
  Query: {
    validateInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      const result = (
        await context.database.query({
          query: `
        MATCH (inviteCode:InviteCode { code: toUpper($args.code) })
        WHERE inviteCode.expiresAt IS NULL
          OR datetime(inviteCode.expiresAt) >=  datetime() 
        RETURN inviteCode {.*}`,
          variables: { args },
        })
      ).records

      if (result.length !== 1) {
        return null
      }

      return result[0].get('inviteCode')
    },
  },
  Mutation: {
    generatePersonalInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      const userInviteCodeAmount = (
        await context.database.query({
          query: `
        MATCH (inviteCode:InviteCode)<-[:GENERATED]-(user:User {id: $user.id})
        WHERE NOT (inviteCode)-[:INVITES_TO]->(:Group)
          AND (inviteCode.expiresAt IS NULL OR inviteCode.expiresAt >= datetime())
        RETURN toString(count(inviteCode)) as count
        `,
          variables: { user: context.user },
        })
      ).records[0].get('count')

      if (
        parseInt(userInviteCodeAmount as string) >= context.policy.get('inviteCodesPersonalPerUser')
      ) {
        throw new AppError(Errors.INVITE_CODE_CREATE_LIMIT_REACHED)
      }

      let code = generateInviteCode()
      while (!(await uniqueInviteCode(context, code))) {
        code = generateInviteCode()
      }

      return (
        await context.database.write({
          // We delete a potential old invite code if there is a collision on an expired code
          query: `
          MATCH (user:User {id: $user.id})
          OPTIONAL MATCH (oldInviteCode:InviteCode { code: toUpper($code) })
          DETACH DELETE oldInviteCode
          MERGE (user)-[:GENERATED]->(inviteCode:InviteCode { code: toUpper($code)})
          ON CREATE SET
            inviteCode.createdAt = toString(datetime()),
            inviteCode.expiresAt = $args.expiresAt,
            inviteCode.comment = $args.comment
          RETURN inviteCode {.*}`,
          variables: { user: context.user, code, args },
        })
      ).records[0].get('inviteCode')
    },
    generateGroupInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      // Two rights, one object: group.invite lets a member bring in people who already have an
      // account, group.invite.external additionally entitles the code's holder to register. The
      // code records which of the two it is, and the registration path reads it back
      // (validateInviteCode above).
      const authorization = await context.groupAuthorization.forGroup(args.groupId as string)
      const externalAllowed = !!authorization?.has('group.invite.external')
      const userInviteCodeAmount = (
        await context.database.query({
          query: `
          MATCH (:Group {id: $args.groupId})<-[:INVITES_TO]-(inviteCode:InviteCode)<-[:GENERATED]-(user:User {id: $user.id})
          WHERE inviteCode.expiresAt IS NULL
            OR inviteCode.expiresAt >= datetime()
          RETURN toString(count(inviteCode)) as count
          `,
          variables: { user: context.user, args },
        })
      ).records[0].get('count')

      if (
        parseInt(userInviteCodeAmount as string) >= context.policy.get('inviteCodesGroupPerUser')
      ) {
        throw new AppError(Errors.INVITE_CODE_CREATE_LIMIT_REACHED)
      }

      let code = generateInviteCode()
      while (!(await uniqueInviteCode(context, code))) {
        code = generateInviteCode()
      }

      const inviteCode = (
        await context.database.write({
          query: `
          MATCH
            (user:User {id: $user.id})-[membership:MEMBER_OF]->(group:Group {id: $args.groupId})
          WHERE NOT membership.role = 'pending'
          OPTIONAL MATCH (oldInviteCode:InviteCode { code: toUpper($code) })
          DETACH DELETE oldInviteCode
          MERGE (user)-[:GENERATED]->(inviteCode:InviteCode { code: toUpper($code) })-[:INVITES_TO]->(group)
          ON CREATE SET
            inviteCode.createdAt = toString(datetime()),
            inviteCode.expiresAt = $args.expiresAt,
            inviteCode.comment = $args.comment,
            inviteCode.externalAllowed = $externalAllowed
          RETURN inviteCode {.*}`,
          variables: { user: context.user, code, args, externalAllowed },
        })
      ).records

      if (inviteCode.length !== 1) {
        // Not a member
        throw new AppError(Errors.INVITE_CODE_CREATE_GROUP_MEMBERSHIP_REQUIRED)
      }

      return inviteCode[0].get('inviteCode')
    },
    invalidateInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      const result = (
        await context.database.write({
          query: `
        MATCH (user:User {id: $user.id})-[:GENERATED]-(inviteCode:InviteCode {code: toUpper($args.code)})
        SET inviteCode.expiresAt = toString(datetime())
        RETURN inviteCode {.*}`,
          variables: { args, user: context.user },
        })
      ).records

      if (result.length !== 1) {
        // Link not generated by this user or does not exist
        throw new AppError(Errors.INVITE_CODE_INVALIDATE_CODE_NOT_FOUND)
      }

      return result[0].get('inviteCode')
    },
    redeemInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      return redeemInviteCode(context, args.code)
    },
  },
  InviteCode: {
    invitedTo: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.code) {
        return null
      }

      const result = (
        await context.database.query({
          query: `
        MATCH (inviteCode:InviteCode {code: $parent.code})-[:INVITES_TO]->(group:Group)
        RETURN group {.*}
        `,
          variables: { parent },
        })
      ).records

      if (result.length !== 1) {
        return null
      }
      // Reached THROUGH the code, which is the entitlement: whoever holds it was handed it by
      // somebody in the group, so they get to know which group they were invited to — name,
      // summary and avatar — even while logged out, and even for an unlisted group. Without
      // this marker the registration screen would ask them to sign up for "".
      //
      // Server-set and not a GraphQL field: no request can claim it (see Group.name/about).
      return { ...(result[0].get('group') as Record<string, unknown>), invitedThroughCode: true }
    },
    isValid: async (parent: { code?: string }, _args, context: Context, _resolveInfo) => {
      if (!parent.code) {
        return false
      }
      // Redeemable, which is NOT the same as "one may register with it": an invite a member
      // handed out with `group.invite` alone is perfectly usable and used to be filed under
      // "expired" here, because this field asked the registration question.
      return isInviteCodeRedeemable(context, parent.code)
    },
    allowsRegistration: async (
      parent: { code?: string },
      _args,
      context: Context,
      _resolveInfo,
    ) => {
      if (!parent.code) {
        return false
      }
      return inviteCodeAllowsRegistration(context, parent.code)
    },
    ...Resolver('InviteCode', {
      idAttribute: 'code',
      count: {
        redeemedByCount: '<-[:REDEEMED]-(related:User)',
      },
      hasOne: {
        generatedBy: '<-[:GENERATED]-(related:User)',
      },
      hasMany: {
        redeemedBy: '<-[:REDEEMED]-(related:User)',
      },
    }),
  },
}

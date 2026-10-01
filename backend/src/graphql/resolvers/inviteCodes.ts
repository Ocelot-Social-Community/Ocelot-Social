/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
    // Where an invited membership lands follows the group's RIGHTS, exactly as JoinGroup does
    // it: whoever may enter without approval (`group.join`) becomes a member, everybody else
    // waits as an applicant. The group type still decides — it just does so through the
    // non-member role it seeded, so a group that opened or closed its own door is not overruled
    // here. The authorization is resolved for the redeeming viewer, who has no membership yet
    // and therefore sees the group's `none` role.
    const authorization = await context.groupAuthorization.forGroup(group.id as string)
    // A group with no role definitions at all — one that predates them, or a deployment between
    // the code and its migration — falls back to what the group TYPE used to say. Failing
    // closed here would be wrong in a way the read paths can afford and this cannot: it would
    // quietly turn every invited person into an applicant until the migration runs.
    const role = (
      authorization?.hasRoleDefinition
        ? authorization.has('group.join')
        : group.groupType === 'public'
    )
      ? USUAL_ROLE
      : PENDING_ROLE

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
      `,
      variables: { user: context.user, code, role },
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
        throw new Error('You have reached the maximum of Invite Codes you can generate')
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
        throw new Error(
          'You have reached the maximum of Invite Codes you can generate for this group',
        )
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
        throw new Error('Not Authorized!')
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
        throw new Error('Not Authorized!')
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
      return result[0].get('group')
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

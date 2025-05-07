/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import CONFIG from '@config/index'
import registrationConstants from '@constants/registrationBranded'
// eslint-disable-next-line import/no-cycle
import { Context } from '@src/server'

import Resolver from './helpers/Resolver'

export const generateInviteCode = () => {
  // 6 random numbers in [ 0, 35 ] are 36 possible numbers (10 [0-9] + 26 [A-Z])
  return Array.from(
    { length: registrationConstants.INVITE_CODE_LENGTH },
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
        WHERE inviteCode.expiresAt >= datetime()
        RETURN toString(count(inviteCode)) AS count`,
        variables: { code },
      })
    ).records[0].get('count') === '0'
  )
}

export const validateInviteCode = async (context: Context, inviteCode) => {
  const result = (
    await context.database.query({
      query: `
      OPTIONAL MATCH (inviteCode:InviteCode { code: toUpper($inviteCode) })
      RETURN
        CASE
        WHEN inviteCode IS NULL THEN false
        WHEN inviteCode.expiresAt IS NULL THEN true
        WHEN datetime(inviteCode.expiresAt) >=  datetime() THEN true
        ELSE false END AS result
      `,
      variables: { inviteCode },
    })
  ).records
  return result[0].get('result') === true
}

export const redeemInviteCode = async (context: Context, code) => {
  const result = (
    await context.database.query({
      query: `
      MATCH (inviteCode:InviteCode {code: toUpper($code)})<-[:GENERATED]-(host:User)
      OPTIONAL MATCH (inviteCode)-[:INVITES_TO]->(group:Group)
      WHERE inviteCode.expiresAt IS NULL
        OR datetime(inviteCode.expiresAt) >= datetime()
      RETURN inviteCode {.*}, group {.*}`,
      variables: { code },
    })
  ).records

  if (result.length !== 1) {
    return false
  }

  const inviteCode = result[0].get('inviteCode')
  const group = result[0].get('group')

  if (!inviteCode) {
    return false
  }

  // Personal Invite Link
  if (!group) {
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
    const role = ['closed', 'hidden'].includes(group.type as string) ? 'pending' : 'usual'

    await context.database.write({
      query: `
      MATCH (user:User {id: $user.id}), (group:Group)<-[:INVITES_TO]-(inviteCode:InviteCode {code: toUpper($code)})<-[:GENERATED]-(host:User)
      MERGE (user)-[:REDEEMED { createdAt: toString(datetime()) }]->(inviteCode)
      MERGE (host)-[:INVITED { createdAt: toString(datetime()) }]->(user)
      MERGE (user)-[membership:MEMBER_OF]->(group)
        ON CREATE SET
          membership.createdAt = toString(datetime()),
          membership.updatedAt = null,
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
        MATCH (inviteCode:InviteCode)<-[:GENERATED]-(user:user {id: $user.id})
        WHERE NOT (inviteCode)-[:INVITES_TO]-(:Group)
        RETURN toString(count(inviteCode)) as count
        `,
          variables: { user: context.user },
        })
      ).records[0].get('count')

      if (parseInt(userInviteCodeAmount as string) >= CONFIG.INVITE_CODES_PERSONAL_PER_USER) {
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
          MERGE (user)-[:GENERATED]->(inviteCode:InviteCode)
          ON CREATE SET
            inviteCode.code = toUpper($code),
            inviteCode.createdAt = toString(datetime()),
            inviteCode.expiresAt = $args.expiresAt,
            inviteCode.comment = $args.comment
          RETURN inviteCode {.*}`,
          variables: { user: context.user, code, args },
        })
      ).records[0].get('inviteCode')
    },
    generateGroupInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      const userInviteCodeAmount = (
        await context.database.query({
          query: `
          MATCH (inviteCode:InviteCode)<-[:GENERATED]-(user:user {id: $user.id})
          WHERE (inviteCode)-[:INVITES_TO]->(:Group {id: $args.groupId})
          RETURN toString(count(inviteCode)) as count
          `,
          variables: { user: context.user, args },
        })
      ).records[0].get('count')

      if (parseInt(userInviteCodeAmount as string) >= CONFIG.INVITE_CODES_GROUP_PER_USER) {
        throw new Error(
          'You have reached the maximum of Invite Codes you can generate for this group.',
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
            inviteCode.code = toUpper($code),
            inviteCode.createdAt = toString(datetime()),
            inviteCode.expiresAt = $args.expiresAt,
            inviteCode.comment = $args.comment
          RETURN inviteCode {.*}`,
          variables: { user: context.user, code, args },
        })
      ).records

      if (inviteCode.length !== 1) {
        // Not a member
        throw new Error('Not Authorized!')
      }

      return inviteCode[0].get('inviteCode')
    },
    invalidateInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      return (
        await context.database.write({
          query: `
        MATCH (user:User {id: $user.id})-[rel:GENERATED]-(inviteCode:InviteCode {code: toUpper($args.code)})
        SET inviteCode.expiresAt = toString(datetime())
        RETURN inviteCode {.*}`,
          variables: { args, user: context.user },
        })
      ).records[0].get('inviteCode')
    },
    redeemInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      return redeemInviteCode(context, args.inviteCode)
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
    isValid: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.code) {
        return false
      }
      return validateInviteCode(context, parent.code)
    },
    ...Resolver('InviteCode', {
      idAttribute: 'code',
      undefinedToNull: ['expiresAt', 'comment'],
      hasOne: {
        generatedBy: '<-[:GENERATED]-(related:User)',
      },
      hasMany: {
        redeemedBy: '<-[:REDEEMED]-(related:User)',
      },
    }),
  },
}

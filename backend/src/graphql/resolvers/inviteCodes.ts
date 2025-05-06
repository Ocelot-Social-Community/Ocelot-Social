/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import CONFIG from '@config/index'
import registrationConstants from '@constants/registrationBranded'
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

const uniqueInviteCode = async (context: Context, code) => {
  return (
    (
      await context.database.query({
        query: `MATCH (inviteCode:InviteCode { code: $code })
        WHERE inviteCode.expiresAt >= datetime()
        RETURN count(inviteCode) AS count`,
        variables: { code },
      })
    ).records[0].get('count') === 0
  )
}

export const validateInviteCode = async (context: Context, inviteCode) => {
  return !!(
    await context.database.query({
      query: `MATCH (ic:InviteCode { code: toUpper($inviteCode) })
       RETURN
       CASE
       WHEN ic.expiresAt IS NULL THEN true
       WHEN datetime(ic.expiresAt) >=  datetime() THEN true
       ELSE false END AS result`,
      variables: { inviteCode },
    })
  ).records[0].get('result')
}

export const redeemInviteCode = async (context: Context, code) => {
  const result = (
    await context.database.query({
      query: `
      MATCH (inviteCode:InviteCode {code: $code})<-[:GENERATED]-(host:User)
      OPTIONAL MATCH (inviteCode)-[:INVITES_TO]->(group:Group)
      WHERE datetime(inviteCode.expiresAt) >= datetime()
      RETURN inviteCode {.*}, group {.*}`,
      variables: { code },
    })
  ).records[0]

  const inviteCode = result.get('inviteCode')
  const group = result.get('group')

  if (!inviteCode) {
    return false
  }

  // Personal Invite Link
  if (!group) {
    await context.database.write({
      query: `
      MATCH (user:User {id: $user.id}), (inviteCode:InviteCode {code: $code})<-[:GENERATED]-(host:User)
      MERGE (user)-[:REDEEMED { createdAt: toString(datetime()) }]->(inviteCode)
      MERGE (host)-[:INVITED { createdAt: toString(datetime()) }]->(user)
      MERGE (user)-[:FOLLOWS { createdAt: toString(datetime()) }]->(host)
      MERGE (host)-[:FOLLOWS { createdAt: toString(datetime()) }]->(user)
      `,
      variables: { user: context.user, code },
    })
    // Group Invite Link
  } else {
    await context.database.write({
      query: `
      MATCH (user:User {id: $user.id}), (group:Group)<-[:INVITES_TO]-(inviteCode:InviteCode {code: $code})<-[:GENERATED]-(host:User)
      MERGE (user)-[:REDEEMED { createdAt: toString(datetime()) }]->(inviteCode)
      MERGE (host)-[:INVITED { createdAt: toString(datetime()) }]->(user)
      MERGE (user)-[membership:MEMBER_OF]->(group)
        ON CREATE SET
          membership.createdAt = toString(datetime()),
          membership.updatedAt = null,
          membership.role = 'usual'
      `,
      variables: { user: context.user, code },
    })
  }
  return true
}

export default {
  Mutation: {
    generatePersonalInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
      const userInviteCodeAmount = (
        await context.database.query({
          query: `
        MATCH (inviteCode:InviteCode)<-[:GENERATED]-(user:user {id: $user.id})
        WHERE NOT (inviteCode)-[:INVITES_TO]-(:Group)
        RETURN COUNT(inviteCode) as count
        `,
          variables: { user: context.user },
        })
      ).records[0].get('count')

      if (CONFIG.INVITE_CODES_PERSONAL_PER_USER >= userInviteCodeAmount) {
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
          MATCH (inviteCode:InviteCode { code: $code })
          DETACH DELETE inviteCode
          MATCH (user:User {id: $user.id})
           MERGE (user)-[:GENERATED]->(inviteCode)
           ON CREATE SET
           inviteCode.createdAt = toString(datetime()),
           inviteCode.expiresAt = $expiresAt
           RETURN inviteCode {.*}`,
          variables: { user: context.user, code, expiresAt: args.expiresAt },
        })
      ).records[0].get('inviteCode')
    },
  },
  generateGroupInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
    const userInviteCodeAmount = (
      await context.database.query({
        query: `
      MATCH (inviteCode:InviteCode)<-[:GENERATED]-(user:user {id: $user.id})
      WHERE (inviteCode)-[:INVITES_TO]-(:Group)
      RETURN COUNT(inviteCode) as count
      `,
        variables: { user: context.user },
      })
    ).records[0].get('count')

    if (CONFIG.INVITE_CODES_GROUP_PER_USER >= userInviteCodeAmount) {
      throw new Error('You have reached the maximum of Group Invite Codes you can generate')
    }

    let code = generateInviteCode()
    while (!(await uniqueInviteCode(context, code))) {
      code = generateInviteCode()
    }

    const { groupId } = args

    return (
      await context.database.write({
        query: `MATCH (user:User {id: $user.id})
         MERGE (user)-[:GENERATED]->(inviteCode:InviteCode { code: $code })-[:INVITES_TO]->(group:Group {id: $groupId})
         ON CREATE SET
         inviteCode.createdAt = toString(datetime()),
         inviteCode.expiresAt = $expiresAt
         RETURN inviteCode {.*}`,
        variables: { user: context.user, code, expiresAt: args.expiresAt, groupId },
      })
    ).records[0].get('inviteCode')
  },
  invalidateInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
    return (
      await context.database.write({
        query: `
        MATCH (user:User {id: $user.id})-[rel:GENERATED]-(inviteCode:InviteCode {code: $args.code})
        SET inviteCode.expiresAt = toString(datetime())
        RETURN inviteCode {.*}`,
        variables: { args, user: context.user },
      })
    ).records[0].get('inviteCode')
  },
  redeemInviteCode: async (_parent, args, context: Context, _resolveInfo) => {
    return redeemInviteCode(context, args.inviteCode)
  },
  InviteCode: {
    invitedTo: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.code) {
        return null
      }

      return (
        await context.database.query({
          query: `
        MATCH (inviteCode:InviteCode {code: $parent.code})-[:INVITES_TO]->(group:Group)
        RETURN group {.*}
        `,
          variables: { parent },
        })
      ).records[0].get('group')
    },
    invitedFrom: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.code) {
        return null
      }

      return (
        await context.database.query({
          query: `
        MATCH (inviteCode:InviteCode {code: $parent.code})<-[:GENERATED]->(user:User)
        RETURN user {.*}
        `,
          variables: { parent },
        })
      ).records[0].get('user')
    },
    isValid: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.code) {
        return false
      }
      return validateInviteCode(context, parent.code)
    },
    ...Resolver('InviteCode', {
      idAttribute: 'code',
      undefinedToNull: ['expiresAt'],
      hasOne: {
        generatedBy: '<-[:GENERATED]-(related:User)',
      },
      hasMany: {
        redeemedBy: '<-[:REDEEMED]-(related:User)',
      },
    }),
  },
}

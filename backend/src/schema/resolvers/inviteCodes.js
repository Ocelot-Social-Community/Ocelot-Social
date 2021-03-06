import generateInviteCode from './helpers/generateInviteCode'
import Resolver from './helpers/Resolver'

const uniqueInviteCode = async (session, code) => {
  return session.readTransaction(async (txc) => {
    const result = await txc.run(`MATCH (ic:InviteCode { id: $code }) RETURN count(ic) AS count`, {
      code,
    })
    return parseInt(String(result.records[0].get('count'))) === 0
  })
}

export default {
  Query: {
    MyInviteCodes: async (_parent, args, context, _resolveInfo) => {
      const {
        user: { id: userId },
      } = context
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const result = await txc.run(
          `MATCH (user:User {id: $userId})-[:GENERATED]->(ic:InviteCode)
           RETURN properties(ic) AS inviteCodes`,
          {
            userId,
          },
        )
        return result.records.map((record) => record.get('inviteCodes'))
      })
      try {
        const txResult = await readTxResultPromise
        return txResult
      } finally {
        session.close()
      }
    },
    isValidInviteCode: async (_parent, args, context, _resolveInfo) => {
      const { code } = args
      if (!code) return false
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const result = await txc.run(
          `MATCH (ic:InviteCode { code: toUpper($code) })
           RETURN
           CASE
           WHEN ic.expiresAt IS NULL THEN true
           WHEN datetime(ic.expiresAt) >=  datetime() THEN true
           ELSE false END AS result`,
          {
            code,
          },
        )
        return result.records.map((record) => record.get('result'))
      })
      try {
        const txResult = await readTxResultPromise
        return !!txResult[0]
      } finally {
        session.close()
      }
    },
  },
  Mutation: {
    GenerateInviteCode: async (_parent, args, context, _resolveInfo) => {
      const {
        user: { id: userId },
      } = context
      const session = context.driver.session()
      let code = generateInviteCode()
      while (!(await uniqueInviteCode(session, code))) {
        code = generateInviteCode()
      }
      const writeTxResultPromise = session.writeTransaction(async (txc) => {
        const result = await txc.run(
          `MATCH (user:User {id: $userId})
           MERGE (user)-[:GENERATED]->(ic:InviteCode { code: $code })
           ON CREATE SET
           ic.createdAt = toString(datetime()),
           ic.expiresAt = $expiresAt
           RETURN ic AS inviteCode`,
          {
            userId,
            code,
            expiresAt: args.expiresAt,
          },
        )
        return result.records.map((record) => record.get('inviteCode').properties)
      })
      try {
        const txResult = await writeTxResultPromise
        return txResult[0]
      } finally {
        session.close()
      }
    },
  },
  InviteCode: {
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

import { neo4jgraphql } from 'neo4j-graphql-js'
import generateInvieCode from './helpers/generateInviteCode'
import Resolver from './helpers/Resolver'

const uniqueInviteCode = async (session, code) => {
  return session.readTransaction(async (txc) => {
    const result = await txc.run(
      `MATCH (ic:InviteCode { id: $code }) RETURN count(ic) AS count`,
      { code },
    )
     return parseInt(String(result.records[0].get('count'))) === 0
  })
}

export default {
  Mutation: {
    CreateInviteCode: async (_parent, args, context, _resolveInfo) => {
      const {
        user: { id: userId },
      } = context
      const session = context.driver.session()
      let code = generateInvieCode()
      let response
      while(!await uniqueInviteCode(session, code)) {
        code = generateInvieCode()
      }
      const writeTxResultPromise = session.writeTransaction(async (txc) => {
        const result = await txc.run(
          `MATCH (user:User {id: $userId})
           MERGE (user)-[:CREATED]->(ic:InviteCode {
             code: $code,
             createdAt: toString(datetime()),
             uses: $uses,
             maxUses: $maxUses,
             active: true
           }) RETURN ic AS inviteCode`,
          {
            userId,
            code,
            maxUses: args.maxUses,
            uses: 0,
          },
        )
        return result.records.map((record) => record.get('inviteCode').properties)
      })
      try {
        const txResult = await writeTxResultPromise
        console.log(txResult)
        response = txResult[0]
      } finally {
        session.close()
      }
      return response
    }
  },
  InviteCode: {
    ...Resolver('InviteCode', {
      hasOne: {
        createdBy: '<-[:CREATED]-(related:User)',
      },
      hasMany: {
        usedBy: '<-[:USED]-(related:User)',
      },
    }),
  },
}

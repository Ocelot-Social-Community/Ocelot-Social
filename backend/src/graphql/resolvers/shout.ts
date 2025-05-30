/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export default {
  Mutation: {
    shout: async (_object, params, context, _resolveInfo) => {
      const { id, type } = params

      const session = context.driver.session()
      try {
        const shoutWriteTxResultPromise = session.writeTransaction(async (transaction) => {
          const shoutTransactionResponse = await transaction.run(
            `
              MATCH (node {id: $id})<-[:WROTE]-(userWritten:User), (user:User {id: $userId})
              WHERE $type IN labels(node) AND NOT userWritten.id = $userId
              MERGE (user)-[relation:SHOUTED{createdAt:toString(datetime())}]->(node)
              RETURN COUNT(relation) > 0 as isShouted
            `,
            {
              id,
              type,
              userId: context.user.id,
            },
          )
          return shoutTransactionResponse.records.map((record) => record.get('isShouted'))
        })
        const [isShouted] = await shoutWriteTxResultPromise
        return isShouted
      } finally {
        session.close()
      }
    },

    unshout: async (_object, params, context, _resolveInfo) => {
      const { id, type } = params
      const session = context.driver.session()
      try {
        const unshoutWriteTxResultPromise = session.writeTransaction(async (transaction) => {
          const unshoutTransactionResponse = await transaction.run(
            `
              MATCH (user:User {id: $userId})-[relation:SHOUTED]->(node {id: $id})
              WHERE $type IN labels(node)
              DELETE relation
              RETURN COUNT(relation) > 0 as isShouted
            `,
            {
              id,
              type,
              userId: context.user.id,
            },
          )
          return unshoutTransactionResponse.records.map((record) => record.get('isShouted'))
        })
        const [isShouted] = await unshoutWriteTxResultPromise
        return isShouted
      } finally {
        session.close()
      }
    },
  },
}

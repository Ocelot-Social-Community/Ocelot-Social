import { neo4jgraphql } from 'neo4j-graphql-js'

export default {
  Query: {
    Badge: async (object, args, context, resolveInfo) =>
      neo4jgraphql(object, args, context, resolveInfo),
  },

  Mutation: {
    rewardBadge: async (_object, args, context, _resolveInfo) => {
      const {
        user: { id: currentUserId },
      } = context
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (badge:Badge {id: $badgeId}), (rewardedUser:User {id: $userId})
            MERGE (badge)-[relation:REWARDED {by: $currentUserId}]->(rewardedUser)
            RETURN relation, rewardedUser {.*}
          `,
          {
            badgeId,
            userId,
            currentUserId,
          },
        )
        return {
          relation: response.records.map((record) => record.get('relation'))[0],
          rewardedUser: response.records.map((record) => record.get('rewardedUser'))[0],
        }
      })
      try {
        const { relation, rewardedUser } = await writeTxResultPromise
        if (!relation) {
          throw new Error('Could not reward badge! Ensure the user and the badge exist.')
        }
        return rewardedUser
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },

    unrewardBadge: async (_object, args, context, _resolveInfo) => {
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (rewardedUser:User {id: $userId})
            OPTIONAL MATCH (badge:Badge {id: $badgeId})-[reward:REWARDED]->(rewardedUser)
            DELETE reward
            RETURN rewardedUser {.*}
          `,
          {
            badgeId,
            userId,
          },
        )
        return response.records.map((record) => record.get('rewardedUser'))[0]
      })
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
  },
}

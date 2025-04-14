import { neo4jgraphql } from 'neo4j-graphql-js'

export default {
  Query: {
    Badge: async (object, args, context, resolveInfo) =>
      neo4jgraphql(object, args, context, resolveInfo),
  },

  Mutation: {
    verify: async (_object, args, context, _resolveInfo) => {
      const {
        user: { id: currentUserId },
      } = context
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (badge:Badge {id: $badgeId, type: 'verification'}), (user:User {id: $userId})
            OPTIONAL MATCH (:Badge {type: 'verification'})-[verify:VERIFIED]->(user)
            DELETE verify
            MERGE (badge)-[relation:VERIFIED {by: $currentUserId}]->(user)
            RETURN relation, user {.*}
          `,
          {
            badgeId,
            userId,
            currentUserId,
          },
        )
        return {
          relation: response.records.map((record) => record.get('relation'))[0],
          user: response.records.map((record) => record.get('user'))[0],
        }
      })
      try {
        const { relation, user } = await writeTxResultPromise
        if (!relation) {
          throw new Error(
            'Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
          )
        }
        return user
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },

    reward: async (_object, args, context, _resolveInfo) => {
      const {
        user: { id: currentUserId },
      } = context
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (badge:Badge {id: $badgeId, type: 'badge'}), (user:User {id: $userId})
            MERGE (badge)-[relation:REWARDED {by: $currentUserId}]->(user)
            RETURN relation, user {.*}
          `,
          {
            badgeId,
            userId,
            currentUserId,
          },
        )
        return {
          relation: response.records.map((record) => record.get('relation'))[0],
          user: response.records.map((record) => record.get('user'))[0],
        }
      })
      try {
        const { relation, user } = await writeTxResultPromise
        if (!relation) {
          throw new Error(
            'Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
          )
        }
        return user
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },

    unreward: async (_object, args, context, _resolveInfo) => {
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (user:User {id: $userId})
            OPTIONAL MATCH (badge:Badge {id: $badgeId})-[relation:REWARDED|VERIFIED]->(user)
            DELETE relation
            RETURN user {.*}
          `,
          {
            badgeId,
            userId,
          },
        )
        return response.records.map((record) => record.get('user'))[0]
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

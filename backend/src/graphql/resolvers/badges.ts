/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { neo4jgraphql } from 'neo4j-graphql-js'

export const defaultTrophyBadge = {
  id: 'default_trophy',
  type: 'trophy',
  icon: '/img/badges/default_trophy.svg',
  description: '',
  createdAt: '',
}

export const defaultVerificationBadge = {
  id: 'default_verification',
  type: 'verification',
  icon: '/img/badges/default_verification.svg',
  description: '',
  createdAt: '',
}

export default {
  Query: {
    Badge: async (object, args, context, resolveInfo) =>
      neo4jgraphql(object, args, context, resolveInfo),
  },

  Mutation: {
    setVerificationBadge: async (_object, args, context, _resolveInfo) => {
      const {
        user: { id: currentUserId },
      } = context
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (badge:Badge {id: $badgeId, type: 'verification'}), (user:User {id: $userId})
            OPTIONAL MATCH (:Badge {type: 'verification'})-[verify:VERIFIES]->(user)
            DELETE verify
            MERGE (badge)-[relation:VERIFIES {by: $currentUserId}]->(user)
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

    rewardTrophyBadge: async (_object, args, context, _resolveInfo) => {
      const {
        user: { id: currentUserId },
      } = context
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (badge:Badge {id: $badgeId, type: 'trophy'}), (user:User {id: $userId})
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

    revokeBadge: async (_object, args, context, _resolveInfo) => {
      const { badgeId, userId } = args
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const response = await transaction.run(
          `
            MATCH (user:User {id: $userId})
            OPTIONAL MATCH (badge:Badge {id: $badgeId})-[rewarded:REWARDED|VERIFIES]->(user)
            OPTIONAL MATCH (user)-[selected:SELECTED]->(badge)
            DELETE rewarded
            DELETE selected
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
  Badge: {
    isDefault: async (parent, _params, _context, _resolveInfo) =>
      [defaultTrophyBadge.id, defaultVerificationBadge.id].includes(parent.id),
  },
}

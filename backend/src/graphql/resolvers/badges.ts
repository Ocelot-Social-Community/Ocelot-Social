/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { neo4jgraphql } from 'neo4j-graphql-js'

import { TROPHY_BADGES_SELECTED_MAX } from '@constants/badges'
import { Context } from '@src/context'

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
    setVerificationBadge: async (_object, args, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
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
        await session.close()
      }
    },

    rewardTrophyBadge: async (_object, args, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      const {
        user: { id: currentUserId },
      } = context
      const { badgeId, userId } = args

      // Find used slot
      const userBadges = (
        await context.database.query({
          query: `
        MATCH (rewardedBadge:Badge)-[rewarded:REWARDED]->(user:User {id: $userId})
        OPTIONAL MATCH (rewardedBadge)<-[selected:SELECTED]-(user)
        RETURN collect(rewardedBadge {.*}) AS rewardedBadges, collect(toString(selected.slot)) AS usedSlots
        `,
          variables: { userId },
        })
      ).records.map((record) => {
        return {
          rewardedBadges: record.get('rewardedBadges'),
          usedSlots: record.get('usedSlots'),
        }
      })

      const { rewardedBadges, usedSlots } = userBadges[0]

      let slot
      if (
        !rewardedBadges.find((item) => item.id === badgeId) && // badge was not rewarded yet
        usedSlots.length < TROPHY_BADGES_SELECTED_MAX // there is free slots left
      ) {
        for (slot = 0; slot <= TROPHY_BADGES_SELECTED_MAX; slot++) {
          if (!usedSlots.find((item) => parseInt(item) === slot)) {
            break
          }
        }
      }

      // reward badge and assign slot
      const users = (
        await context.database.write({
          query: `
        MATCH (badge:Badge {id: $badgeId, type: 'trophy'}), (user:User {id: $userId})
        MERGE (badge)-[:REWARDED {by: $currentUserId}]->(user)
        ${slot === undefined ? '' : 'MERGE (badge)<-[:SELECTED {slot: $slot}]-(user)'}
        RETURN user {.*}
        `,
          variables: { badgeId, userId, currentUserId, slot },
        })
      ).records.map((record) => record.get('user'))

      if (users.length !== 1) {
        throw new Error(
          'Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
        )
      }

      return users[0]
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

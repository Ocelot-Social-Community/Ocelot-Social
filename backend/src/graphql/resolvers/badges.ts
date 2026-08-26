/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-loop-func */
import { branding } from '@src/branding'

import { unwrap } from './helpers/cypherField'
import Resolver from './helpers/Resolver'

import type { Context } from '@src/context'

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
    // Sort by the stable badge id so the list is deterministic and identical across
    // instances. Without this the order follows the database insertion (seed) order,
    // which differs between instances even though the badge data is the same.
    //
    // Stage C2: hand-written Cypher instead of neo4jgraphql. The query takes no arguments
    // (Badge.gql declares `Badge: [Badge]`), so there is no filtering or pagination to
    // reproduce — the ordering moves into Cypher, and Badge's field resolvers handle
    // `rewarded`/`verifies`.
    Badge: async (_object, _args, context: Context, _resolveInfo) => {
      const session = context.driver.session()
      try {
        return await session.readTransaction(async (transaction) => {
          const result = await transaction.run(
            `
              MATCH (badge:Badge)
              RETURN badge { .* } AS badge
              ORDER BY badge.id ASC
            `,
          )
          return result.records.map((record) => unwrap(record.get('badge')))
        })
      } finally {
        await session.close()
      }
    },
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
        usedSlots.length < branding.badges.trophyBadgesSelectedMax // there is free slots left
      ) {
        // slots are 0-indexed and valid in [0, max-1] (see users.ts slot validation), so the bound is
        // strictly `< max` — never assign slot === max, which that validation rejects.
        for (slot = 0; slot < branding.badges.trophyBadgesSelectedMax; slot++) {
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
      } finally {
        await session.close()
      }
    },
  },
  Badge: {
    // Badge has no `_id` field, unlike Room/Message/User: neo4j-graphql-js excluded this
    // type from augmentation, so it was never generated here and there was nothing to carry
    // forward as an alias.
    //
    // Both edges point FROM the badge TO the user (see `direction: 'in'` on User.rewarded).
    ...Resolver('Badge', {
      hasMany: {
        rewarded: '-[:REWARDED]->(related:User)',
        verifies: '-[:VERIFIES]->(related:User)',
      },
    }),
    isDefault: async (parent, _params, _context, _resolveInfo) =>
      [defaultTrophyBadge.id, defaultVerificationBadge.id].includes(parent.id),
  },
}

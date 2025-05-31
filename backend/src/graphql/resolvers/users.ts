/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UserInputError, ForbiddenError } from 'apollo-server'
import { neo4jgraphql } from 'neo4j-graphql-js'

import { TROPHY_BADGES_SELECTED_MAX } from '@constants/badges'
import { getNeode } from '@db/neo4j'
import { Context } from '@src/server'

import { defaultTrophyBadge, defaultVerificationBadge } from './badges'
import normalizeEmail from './helpers/normalizeEmail'
import Resolver from './helpers/Resolver'
import { images } from './images/images'
import { createOrUpdateLocations } from './users/location'

const neode = getNeode()

export const getMutedUsers = async (context) => {
  const { neode } = context
  const userModel = neode.model('User')
  let mutedUsers = neode
    .query()
    .match('user', userModel)
    .where('user.id', context.user.id)
    .relationship(userModel.relationships().get('muted'))
    .to('muted', userModel)
    .return('muted')
  mutedUsers = await mutedUsers.execute()
  mutedUsers = mutedUsers.records.map((r) => r.get('muted').properties)
  return mutedUsers
}

export const getBlockedUsers = async (context) => {
  const { neode } = context
  const userModel = neode.model('User')
  let blockedUsers = neode
    .query()
    .match('user', userModel)
    .where('user.id', context.user.id)
    .relationship(userModel.relationships().get('blocked'))
    .to('blocked', userModel)
    .return('blocked')
  blockedUsers = await blockedUsers.execute()
  blockedUsers = blockedUsers.records.map((r) => r.get('blocked').properties)
  return blockedUsers
}

export default {
  Query: {
    mutedUsers: async (_object, _args, context, _resolveInfo) => {
      try {
        return getMutedUsers(context)
      } catch (e) {
        throw new UserInputError(e.message)
      }
    },
    blockedUsers: async (_object, _args, context, _resolveInfo) => {
      try {
        return getBlockedUsers(context)
      } catch (e) {
        throw new UserInputError(e.message)
      }
    },
    User: async (object, args, context, resolveInfo) => {
      if (args.email) {
        args.email = normalizeEmail(args.email)
        let session
        try {
          session = context.driver.session()
          const readTxResult = await session.readTransaction((txc) => {
            const result = txc.run(
              `
            MATCH (user:User)-[:PRIMARY_EMAIL]->(e:EmailAddress {email: $args.email})
            RETURN user {.*, email: e.email}`,
              { args },
            )
            return result
          })
          return readTxResult.records.map((r) => r.get('user'))
        } finally {
          session.close()
        }
      }
      return neo4jgraphql(object, args, context, resolveInfo)
    },
  },
  Mutation: {
    muteUser: async (_parent, params, context, _resolveInfo) => {
      const { user: currentUser } = context
      if (currentUser.id === params.id) return null
      await neode.writeCypher(
        `
          MATCH(u:User {id: $currentUser.id})-[previousRelationship:FOLLOWS]->(b:User {id: $params.id})
          DELETE previousRelationship
        `,
        { currentUser, params },
      )
      const [user, mutedUser] = await Promise.all([
        neode.find('User', currentUser.id),
        neode.find('User', params.id),
      ])
      await user.relateTo(mutedUser, 'muted')
      return mutedUser.toJson()
    },
    unmuteUser: async (_parent, params, context, _resolveInfo) => {
      const { user: currentUser } = context
      if (currentUser.id === params.id) return null
      await neode.writeCypher(
        `
          MATCH(u:User {id: $currentUser.id})-[previousRelationship:MUTED]->(b:User {id: $params.id})
          DELETE previousRelationship
        `,
        { currentUser, params },
      )
      const unmutedUser = await neode.find('User', params.id)
      return unmutedUser.toJson()
    },
    blockUser: async (_object, args, context, _resolveInfo) => {
      const { user: currentUser } = context
      if (currentUser.id === args.id) return null

      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const unBlockUserTransactionResponse = await transaction.run(
          `
            MATCH (blockedUser:User {id: $args.id})
            MATCH (currentUser:User {id: $currentUser.id})
            OPTIONAL MATCH (currentUser)-[r:FOLLOWS]->(blockedUser)
            DELETE r
            CREATE (currentUser)-[:BLOCKED]->(blockedUser)
            RETURN blockedUser {.*}
          `,
          { currentUser, args },
        )
        return unBlockUserTransactionResponse.records.map((record) => record.get('blockedUser'))[0]
      })
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new UserInputError(error.message)
      } finally {
        session.close()
      }
    },
    unblockUser: async (_object, args, context, _resolveInfo) => {
      const { user: currentUser } = context
      if (currentUser.id === args.id) return null

      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const unBlockUserTransactionResponse = await transaction.run(
          `
            MATCH(u:User {id: $currentUser.id})-[r:BLOCKED]->(blockedUser:User {id: $args.id})
            DELETE r
            RETURN blockedUser {.*}
          `,
          { currentUser, args },
        )
        return unBlockUserTransactionResponse.records.map((record) => record.get('blockedUser'))[0]
      })
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new UserInputError(error.message)
      } finally {
        session.close()
      }
    },
    UpdateUser: async (_parent, params, context, _resolveInfo) => {
      const { avatar: avatarInput } = params
      delete params.avatar
      params.locationName = params.locationName === '' ? null : params.locationName
      const { termsAndConditionsAgreedVersion } = params
      if (termsAndConditionsAgreedVersion) {
        const regEx = /^[0-9]+\.[0-9]+\.[0-9]+$/g
        if (!regEx.test(termsAndConditionsAgreedVersion)) {
          throw new ForbiddenError('Invalid version format!')
        }
        params.termsAndConditionsAgreedAt = new Date().toISOString()
      }

      const {
        emailNotificationSettings,
      }: { emailNotificationSettings: { name: string; value: boolean }[] | undefined } = params
      delete params.emailNotificationSettings
      if (emailNotificationSettings) {
        emailNotificationSettings.forEach((setting) => {
          params[
            'emailNotifications' + setting.name.charAt(0).toUpperCase() + setting.name.slice(1)
          ] = setting.value
        })
      }

      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const updateUserTransactionResponse = await transaction.run(
          `
            MATCH (user:User {id: $params.id})
            SET user += $params
            SET user.updatedAt = toString(datetime())
            RETURN user {.*}
          `,
          { params },
        )
        const [user] = updateUserTransactionResponse.records.map((record) => record.get('user'))
        if (avatarInput) {
          await images.mergeImage(user, 'AVATAR_IMAGE', avatarInput, { transaction })
        }
        return user
      })
      try {
        const user = await writeTxResultPromise
        // TODO: put in a middleware, see "CreateGroup", "UpdateGroup"
        await createOrUpdateLocations('User', params.id, params.locationName, session)
        return user
      } catch (error) {
        throw new UserInputError(error.message)
      } finally {
        session.close()
      }
    },
    DeleteUser: async (_object, params, context, _resolveInfo) => {
      const { resource, id: userId } = params
      const session = context.driver.session()

      const deleteUserTxResultPromise = session.writeTransaction(async (transaction) => {
        if (resource?.length) {
          await Promise.all(
            resource.map(async (node) => {
              const txResult = await transaction.run(
                `
                MATCH (resource:${node})<-[:WROTE]-(author:User {id: $userId})
                OPTIONAL MATCH (resource)<-[:COMMENTS]-(comment:Comment)
                SET resource.deleted = true
                SET resource.content = 'UNAVAILABLE'
                SET resource.contentExcerpt = 'UNAVAILABLE'
                SET resource.language = 'UNAVAILABLE'
                SET resource.createdAt = 'UNAVAILABLE'
                SET resource.updatedAt = 'UNAVAILABLE'
                SET comment.deleted = true
                RETURN resource {.*}
              `,
                {
                  userId,
                },
              )
              return Promise.all(
                txResult.records
                  .map((record) => record.get('resource'))
                  .map((resource) => images.deleteImage(resource, 'HERO_IMAGE', { transaction })),
              )
            }),
          )
        }

        const deleteUserTransactionResponse = await transaction.run(
          `
              MATCH (user:User {id: $userId})
              SET user.deleted = true
              SET user.name = 'UNAVAILABLE'
              SET user.about = 'UNAVAILABLE'
              SET user.lastActiveAt = 'UNAVAILABLE'
              SET user.createdAt = 'UNAVAILABLE'
              SET user.updatedAt = 'UNAVAILABLE'
              SET user.termsAndConditionsAgreedVersion = 'UNAVAILABLE'
              SET user.encryptedPassword = null
              WITH user
              OPTIONAL MATCH (user)<-[:BELONGS_TO]-(email:EmailAddress)
              DETACH DELETE email
              WITH user
              OPTIONAL MATCH (user)<-[:OWNED_BY]-(socialMedia:SocialMedia)
              DETACH DELETE socialMedia
              RETURN user {.*}
            `,
          { userId },
        )
        const [user] = deleteUserTransactionResponse.records.map((record) => record.get('user'))
        await images.deleteImage(user, 'AVATAR_IMAGE', { transaction })
        return user
      })
      try {
        const user = await deleteUserTxResultPromise
        return user
      } finally {
        session.close()
      }
    },
    switchUserRole: async (_object, args, context, _resolveInfo) => {
      const { role, id } = args

      if (context.user.id === id) throw new Error('you-cannot-change-your-own-role')
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const switchUserRoleResponse = await transaction.run(
          `
            MATCH (user:User {id: $id})
            OPTIONAL MATCH (user)-[:PRIMARY_EMAIL]->(e:EmailAddress)
            SET user.role = $role
            SET user.updatedAt = toString(datetime())
            RETURN user {.*, email: e.email}
          `,
          { id, role },
        )
        return switchUserRoleResponse.records.map((record) => record.get('user'))[0]
      })
      try {
        const user = await writeTxResultPromise
        return user
      } finally {
        session.close()
      }
    },
    saveCategorySettings: async (_object, args, context, _resolveInfo) => {
      const { activeCategories } = args
      const {
        user: { id },
      } = context

      const session = context.driver.session()
      await session.writeTransaction((transaction) => {
        return transaction.run(
          `
          MATCH (user:User { id: $id })-[previousCategories:NOT_INTERESTED_IN]->(category:Category)
          DELETE previousCategories
          RETURN user, category
        `,
          { id },
        )
      })

      // frontend gives [] when all categories are selected (default)
      if (activeCategories.length === 0) return true

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const saveCategorySettingsResponse = await transaction.run(
          `
            MATCH (category:Category) WHERE NOT category.id IN $activeCategories
            MATCH (user:User { id: $id })
            MERGE (user)-[r:NOT_INTERESTED_IN]->(category)
            RETURN user, r, category
          `,
          { id, activeCategories },
        )
        const [user] = await saveCategorySettingsResponse.records.map((record) =>
          record.get('user'),
        )
        return user
      })
      try {
        await writeTxResultPromise
        return true
      } finally {
        session.close()
      }
    },
    updateOnlineStatus: async (_object, args, context, _resolveInfo) => {
      const { status } = args
      const {
        user: { id },
      } = context

      const CYPHER_AWAY = `
          MATCH (user:User {id: $id})
          WITH user,
          CASE user.lastOnlineStatus
            WHEN 'away' THEN user.awaySince
            ELSE toString(datetime())
          END AS awaySince
          SET user.awaySince = awaySince
          SET user.lastOnlineStatus = $status
        `
      const CYPHER_ONLINE = `
          MATCH (user:User {id: $id})
            SET user.awaySince = null
            SET user.lastOnlineStatus = $status
        `

      // Last Online Time is saved as `lastActiveAt`
      const session = context.driver.session()
      await session.writeTransaction((transaction) => {
        // return transaction.run(status === 'away' ? CYPHER_AWAY : CYPHER_ONLINE, { id, status })
        return transaction.run(status === 'away' ? CYPHER_AWAY : CYPHER_ONLINE, { id, status })
      })

      return true
    },
    setTrophyBadgeSelected: async (_object, args, context, _resolveInfo) => {
      const { slot, badgeId } = args
      const {
        user: { id: userId },
      } = context

      if (slot >= TROPHY_BADGES_SELECTED_MAX || slot < 0) {
        throw new Error(
          `Invalid slot! There is only ${TROPHY_BADGES_SELECTED_MAX} badge-slots to fill`,
        )
      }

      const session = context.driver.session()

      const query = session.writeTransaction(async (transaction) => {
        const queryBadge = `
            MATCH (user:User {id: $userId})<-[:REWARDED]-(badge:Badge {id: $badgeId})
            OPTIONAL MATCH (user)-[badgeRelation:SELECTED]->(badge)
            OPTIONAL MATCH (user)-[slotRelation:SELECTED{slot: $slot}]->(:Badge)
            DELETE badgeRelation, slotRelation
            MERGE (user)-[:SELECTED{slot: toInteger($slot)}]->(badge)
            RETURN user {.*}
          `
        const queryEmpty = `
            MATCH (user:User {id: $userId})
            OPTIONAL MATCH (user)-[slotRelation:SELECTED {slot: $slot}]->(:Badge)
            DELETE slotRelation
            RETURN user {.*}
          `
        const isDefault = !badgeId || badgeId === defaultTrophyBadge.id

        const result = await transaction.run(isDefault ? queryEmpty : queryBadge, {
          userId,
          badgeId,
          slot,
        })
        return result.records.map((record) => record.get('user'))[0]
      })
      try {
        const user = await query
        if (!user) {
          throw new Error('You cannot set badges not rewarded to you.')
        }
        return user
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    resetTrophyBadgesSelected: async (_object, _args, context, _resolveInfo) => {
      const {
        user: { id: userId },
      } = context

      const session = context.driver.session()

      const query = session.writeTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (user:User {id: $userId})
            OPTIONAL MATCH (user)-[relation:SELECTED]->(:Badge)
            DELETE relation
            RETURN user {.*}
          `,
          { userId },
        )
        return result.records.map((record) => record.get('user'))[0]
      })
      try {
        return await query
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
  },
  User: {
    inviteCodes: async (_parent, _args, context: Context, _resolveInfo) => {
      return (
        await context.database.query({
          query: `
          MATCH (user:User {id: $user.id})-[:GENERATED]->(inviteCodes:InviteCode)
          WHERE NOT (inviteCodes)-[:INVITES_TO]->(:Group)
          RETURN inviteCodes {.*}
          ORDER BY inviteCodes.createdAt ASC
          `,
          variables: { user: context.user },
        })
      ).records.map((record) => record.get('inviteCodes'))
    },
    emailNotificationSettings: async (parent, _params, _context, _resolveInfo) => {
      return [
        {
          type: 'post',
          settings: [
            {
              name: 'commentOnObservedPost',
              value: parent.emailNotificationsCommentOnObservedPost ?? true,
            },
            {
              name: 'mention',
              value: parent.emailNotificationsMention ?? true,
            },
            {
              name: 'followingUsers',
              value: parent.emailNotificationsFollowingUsers ?? true,
            },
            {
              name: 'postInGroup',
              value: parent.emailNotificationsPostInGroup ?? true,
            },
          ],
        },
        {
          type: 'chat',
          settings: [
            {
              name: 'chatMessage',
              value: parent.emailNotificationsChatMessage ?? true,
            },
          ],
        },
        {
          type: 'group',
          settings: [
            {
              name: 'groupMemberJoined',
              value: parent.emailNotificationsGroupMemberJoined ?? true,
            },
            {
              name: 'groupMemberLeft',
              value: parent.emailNotificationsGroupMemberLeft ?? true,
            },
            {
              name: 'groupMemberRemoved',
              value: parent.emailNotificationsGroupMemberRemoved ?? true,
            },
            {
              name: 'groupMemberRoleChanged',
              value: parent.emailNotificationsGroupMemberRoleChanged ?? true,
            },
          ],
        },
      ]
    },
    badgeTrophiesSelected: async (parent, _params, context, _resolveInfo) => {
      const session = context.driver.session()

      const query = session.readTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (user:User {id: $parent.id})-[relation:SELECTED]->(badge:Badge)
            WITH relation, badge
            ORDER BY relation.slot ASC
            RETURN relation.slot as slot, badge {.*}
          `,
          { parent },
        )
        return result.records
      })
      try {
        const badgesSelected = await query
        const result = Array(TROPHY_BADGES_SELECTED_MAX).fill(defaultTrophyBadge)
        badgesSelected.map((record) => {
          result[record.get('slot')] = record.get('badge')
          return true
        })
        return result
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    badgeTrophiesUnused: async (parent, _params, context, _resolveInfo) => {
      const session = context.driver.session()

      const query = session.readTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (user:User {id: $parent.id})<-[:REWARDED]-(badge:Badge)
            WHERE NOT (user)-[:SELECTED]-(badge)
            RETURN badge {.*}
          `,
          { parent },
        )
        return result.records.map((record) => record.get('badge'))
      })
      try {
        return await query
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    badgeTrophiesUnusedCount: async (parent, _params, context, _resolveInfo) => {
      const session = context.driver.session()

      const query = session.readTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (user:User {id: $parent.id})<-[:REWARDED]-(badge:Badge)
            WHERE NOT (user)-[:SELECTED]-(badge)
            RETURN toString(COUNT(badge)) as count
          `,
          { parent },
        )
        return result.records.map((record) => record.get('count'))[0]
      })
      try {
        return await query
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    badgeVerification: async (parent, _params, context, _resolveInfo) => {
      const session = context.driver.session()

      const query = session.writeTransaction(async (transaction) => {
        const result = await transaction.run(
          `
            MATCH (user:User {id: $parent.id})<-[:VERIFIES]-(verification:Badge)
            RETURN verification {.*}
          `,
          { parent },
        )
        return result.records.map((record) => record.get('verification'))[0]
      })
      try {
        const result = await query
        return result ?? defaultVerificationBadge
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    ...Resolver('User', {
      undefinedToNull: [
        'actorId',
        'deleted',
        'disabled',
        'locationName',
        'about',
        'termsAndConditionsAgreedVersion',
        'termsAndConditionsAgreedAt',
        'allowEmbedIframes',
        'showShoutsPublicly',
        'locale',
      ],
      boolean: {
        followedByCurrentUser:
          'MATCH (this)<-[:FOLLOWS]-(u:User {id: $cypherParams.currentUserId}) RETURN COUNT(u) >= 1',
        isBlocked:
          'MATCH (this)<-[:BLOCKED]-(u:User {id: $cypherParams.currentUserId}) RETURN COUNT(u) >= 1',
        blocked:
          'MATCH (this)-[:BLOCKED]-(u:User {id: $cypherParams.currentUserId}) RETURN COUNT(u) >= 1',
        isMuted:
          'MATCH (this)<-[:MUTED]-(u:User {id: $cypherParams.currentUserId}) RETURN COUNT(u) >= 1',
      },
      count: {
        contributionsCount:
          '-[:WROTE]->(related:Post) WHERE NOT related.disabled = true AND NOT related.deleted = true',
        friendsCount: '<-[:FRIENDS]->(related:User)',
        followingCount: '-[:FOLLOWS]->(related:User)',
        followedByCount: '<-[:FOLLOWS]-(related:User)',
        commentedCount:
          '-[:WROTE]->(c:Comment)-[:COMMENTS]->(related:Post) WHERE NOT related.disabled = true AND NOT related.deleted = true',
        shoutedCount:
          '-[:SHOUTED]->(related:Post) WHERE NOT related.disabled = true AND NOT related.deleted = true',
        badgeTrophiesCount: '<-[:REWARDED]-(related:Badge)',
      },
      hasOne: {
        avatar: '-[:AVATAR_IMAGE]->(related:Image)',
        invitedBy: '<-[:INVITED]-(related:User)',
        location: '-[:IS_IN]->(related:Location)',
        redeemedInviteCode: '-[:REDEEMED]->(related:InviteCode)',
      },
      hasMany: {
        followedBy: '<-[:FOLLOWS]-(related:User)',
        following: '-[:FOLLOWS]->(related:User)',
        friends: '-[:FRIENDS]-(related:User)',
        socialMedia: '<-[:OWNED_BY]-(related:SocialMedia)',
        contributions: '-[:WROTE]->(related:Post)',
        comments: '-[:WROTE]->(related:Comment)',
        shouted: '-[:SHOUTED]->(related:Post)',
        categories: '-[:CATEGORIZED]->(related:Category)',
        badgeTrophies: '<-[:REWARDED]-(related:Badge)',
      },
    }),
  },
}

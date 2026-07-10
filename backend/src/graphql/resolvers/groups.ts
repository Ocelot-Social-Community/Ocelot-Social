/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { withFilter } from 'graphql-subscriptions'
import { v4 as uuid } from 'uuid'

import { CATEGORIES_MIN, CATEGORIES_MAX } from '@constants/categories'
import { DESCRIPTION_WITHOUT_HTML_LENGTH_MIN } from '@constants/groups'
import {
  GROUP_MEMBERSHIP_VISIBILITY_CHANGED,
  GROUP_SHOW_MEMBERS_CHANGED,
} from '@constants/subscriptions'
import { ForbiddenError, UserInputError } from '@graphql/errors'
import { removeHtmlTags } from '@middleware/helpers/cleanHtml'

import Resolver from './helpers/Resolver'
import { images } from './images/images'
import { createOrUpdateLocations } from './users/location'

import type { Context } from '@src/context'

// Whether any Category nodes exist. Keeps CreateGroup graceful: the "categories
// required" rule only applies when the policy is on AND there is at least one
// category to choose from (mirrors the frontend gating in getCategoriesMixin).
const categoriesExist = async (context: Context): Promise<boolean> => {
  const session = context.driver.session()
  try {
    return await session.readTransaction(async (txc) => {
      const result = await txc.run(
        'MATCH (category:Category) RETURN count(category) > 0 AS hasCategories',
      )
      return Boolean(result.records[0]?.get('hasCategories'))
    })
  } finally {
    await session.close()
  }
}

export default {
  Query: {
    Group: async (_object, params, context: Context, _resolveInfo) => {
      const { isMember, hasLocation, id, slug, first, offset } = params
      const session = context.driver.session()
      try {
        return await session.readTransaction(async (txc) => {
          if (!context.user) {
            throw new Error('Missing authenticated user.')
          }
          const matchFilters: string[] = []
          if (id !== undefined) matchFilters.push('group.id = $id')
          if (slug !== undefined) matchFilters.push('group.slug = $slug')
          const matchWhere = matchFilters.length ? `WHERE ${matchFilters.join(' AND ')}` : ''

          const locationMatch = hasLocation === true ? 'MATCH (group)-[:IS_IN]->(:Location)' : ''

          const transactionResponse = await txc.run(
            `
            MATCH (group:Group)
            ${matchWhere}
            ${locationMatch}
            OPTIONAL MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group)
            WITH group, membership
            ${(isMember === true && "WHERE membership IS NOT NULL AND (group.groupType IN ['public', 'closed']) OR (group.groupType = 'hidden' AND membership.role IN ['usual', 'admin', 'owner'])") || ''}
            ${(isMember === false && "WHERE membership IS NULL AND (group.groupType IN ['public', 'closed'])") || ''}
            ${(isMember === undefined && "WHERE (group.groupType IN ['public', 'closed']) OR (group.groupType = 'hidden' AND membership.role IN ['usual', 'admin', 'owner'])") || ''}
            RETURN group {.*, myRole: membership.role, showOnProfile: coalesce(membership.showOnProfile, true)}
            ORDER BY group.createdAt DESC
            ${first !== undefined && offset !== undefined ? 'SKIP toInteger($offset) LIMIT toInteger($first)' : ''}
          `,
            {
              userId: context.user.id,
              id,
              slug,
              first,
              offset,
            },
          )
          return transactionResponse.records.map((record) => record.get('group'))
        })
      } finally {
        await session.close()
      }
    },
    GroupMembers: async (_object, params, context: Context, _resolveInfo) => {
      const { id: groupId, first = 25, offset = 0, includePending = false, nameFilter } = params
      const viewerId = context.user?.id ?? ''
      const nameFilterClause =
        nameFilter && nameFilter.length >= 3
          ? 'AND toLower(user.name) CONTAINS toLower($nameFilter)'
          : ''
      const session = context.driver.session()
      try {
        return await session.readTransaction(async (txc) => {
          const memberCheckResult = await txc.run(
            `MATCH (:User {id: $viewerId})-[m:MEMBER_OF]->(:Group {id: $groupId})
             WHERE m.role IN ['usual', 'admin', 'owner']
             RETURN m.role AS role`,
            { viewerId, groupId },
          )
          const isMember = memberCheckResult.records.length > 0

          let cypher: string
          const roleOrder = `
            CASE membership.role
              WHEN 'owner' THEN 0
              WHEN 'admin' THEN 1
              WHEN 'usual' THEN 2
              ELSE 3
            END, user.name`
          if (isMember) {
            const pendingFilter = includePending ? '' : "AND membership.role <> 'pending'"
            cypher = `
              MATCH (user:User)-[membership:MEMBER_OF]->(:Group {id: $groupId})
              WHERE true ${pendingFilter} ${nameFilterClause}
              RETURN user {.*}, membership {.*}
              ORDER BY ${roleOrder}
              SKIP toInteger($offset) LIMIT toInteger($first)
            `
          } else {
            cypher = `
              MATCH (group:Group {id: $groupId})
              WHERE (
                group.groupType = 'public'
                OR (group.groupType = 'closed' AND coalesce(group.showMembers, false) = true)
              )
              MATCH (user:User)-[membership:MEMBER_OF]->(group)
              WHERE membership.role <> 'pending'
                AND coalesce(membership.showOnProfile, true) = true
                ${nameFilterClause}
              RETURN user {.*}, membership {.*}
              ORDER BY ${roleOrder}
              SKIP toInteger($offset) LIMIT toInteger($first)
            `
          }

          const result = await txc.run(cypher, { groupId, first, offset, nameFilter })
          return result.records.map((record) => ({
            user: record.get('user'),
            membership: record.get('membership'),
          }))
        })
      } finally {
        await session.close()
      }
    },
    GroupCount: async (_object, params, context, _resolveInfo) => {
      const { isMember } = params
      const {
        user: { id: userId },
      } = context
      const session = context.driver.session()
      try {
        const result = await session.readTransaction(async (txc) => {
          let cypher
          if (isMember) {
            cypher = `MATCH (user:User)-[membership:MEMBER_OF]->(group:Group)
                      WHERE user.id = $userId
                      AND membership.role IN ['usual', 'admin', 'owner', 'pending']
                      RETURN toString(count(group)) AS count`
          } else {
            cypher = `MATCH (group:Group)
                      OPTIONAL MATCH (user:User)-[membership:MEMBER_OF]->(group)
                      WHERE user.id = $userId
                      WITH group, membership
                      WHERE group.groupType IN ['public', 'closed']
                      OR membership.role IN ['usual', 'admin', 'owner']
                      RETURN toString(count(group)) AS count`
          }
          const transactionResponse = await txc.run(cypher, { userId })
          return transactionResponse.records.map((record) => record.get('count'))[0]
        })
        return parseInt(result, 10) || 0
      } finally {
        await session.close()
      }
    },
  },
  Mutation: {
    CreateGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { policy } = context
      const { categoryIds } = params
      delete params.categoryIds
      params.locationName = params.locationName === '' ? null : params.locationName
      // Only require categories when the feature is on AND at least one category
      // exists — otherwise group creation would be impossible on an empty
      // category DB (mirrors the frontend gating in getCategoriesMixin).
      const enforceCategories = policy.get('categoriesActive') && (await categoriesExist(context))
      if (enforceCategories && (!categoryIds || categoryIds.length < CATEGORIES_MIN)) {
        throw new UserInputError('Too few categories!')
      }
      if (policy.get('categoriesActive') && categoryIds && categoryIds.length > CATEGORIES_MAX) {
        throw new UserInputError('Too many categories!')
      }
      if (
        params.description === undefined ||
        params.description === null ||
        removeHtmlTags(params.description).length < DESCRIPTION_WITHOUT_HTML_LENGTH_MIN
      ) {
        throw new UserInputError('Description too short!')
      }
      params.id = params.id || uuid()
      const session = context.driver.session()
      try {
        const group = await session.writeTransaction(async (transaction) => {
          if (!context.user) {
            throw new Error('Missing authenticated user.')
          }
          // Only emit the categories sub-query for a NON-EMPTY list. With an empty
          // `categoryIds: []` (valid on the no-category graceful path), `UNWIND []`
          // would zero the row stream and the final `RETURN group` would yield
          // nothing — silently breaking group creation.
          const categoriesCypher =
            policy.get('categoriesActive') && categoryIds && categoryIds.length > 0
              ? `
                  WITH group, membership
                  UNWIND $categoryIds AS categoryId
                  MATCH (category:Category {id: categoryId})
                  MERGE (group)-[:CATEGORIZED]->(category)
                `
              : ''
          const ownerCreateGroupTransactionResponse = await transaction.run(
            `
              CREATE (group:Group)
              SET group += $params
              SET group.createdAt = toString(datetime())
              SET group.updatedAt = toString(datetime())
              WITH group
              MATCH (owner:User {id: $userId})
              MERGE (owner)-[:CREATED]->(group)
              MERGE (owner)-[membership:MEMBER_OF]->(group)
              SET
                membership.createdAt = toString(datetime()),
                membership.updatedAt = toString(datetime()),
                membership.role = 'owner'
              ${categoriesCypher}
              RETURN group {.*, myRole: membership.role}
            `,
            { userId: context.user.id, categoryIds, params },
          )
          const [group] = ownerCreateGroupTransactionResponse.records.map((record) =>
            record.get('group'),
          )
          return group
        })
        // TODO: put in a middleware, see "UpdateGroup", "UpdateUser"
        await createOrUpdateLocations('Group', params.id, params.locationName, session, context)
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw error
      } finally {
        await session.close()
      }
    },
    UpdateGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { policy } = context
      const { categoryIds } = params
      delete params.categoryIds
      const { id: groupId, avatar: avatarInput } = params
      delete params.avatar
      params.locationName = params.locationName === '' ? null : params.locationName

      if (policy.get('categoriesActive') && categoryIds) {
        if (categoryIds.length < CATEGORIES_MIN) {
          throw new UserInputError('Too few categories!')
        }
        if (categoryIds.length > CATEGORIES_MAX) {
          throw new UserInputError('Too many categories!')
        }
      }
      if (
        params.description &&
        removeHtmlTags(params.description).length < DESCRIPTION_WITHOUT_HTML_LENGTH_MIN
      ) {
        throw new UserInputError('Description too short!')
      }
      const session = context.driver.session()
      try {
        const group = await session.writeTransaction(async (transaction) => {
          if (!context.user) {
            throw new Error('Missing authenticated user.')
          }
          const previousGroupTypeResult = await transaction.run(
            `MATCH (group:Group {id: $groupId}) RETURN group.groupType AS groupType`,
            { groupId },
          )
          const previousGroupType = previousGroupTypeResult.records[0]?.get('groupType')
          // Turning a group hidden needs group.create_hidden (same gate as creating a
          // hidden group). Keeping an already-hidden group hidden is fine. Switching to
          // other types is intentionally not gated here — only the privacy-raising
          // transition to hidden is.
          if (
            params.groupType === 'hidden' &&
            previousGroupType !== 'hidden' &&
            !context.effectivePermissions.has('group.create_hidden')
          ) {
            throw new ForbiddenError('Not Authorized!')
          }
          if (policy.get('categoriesActive') && categoryIds?.length) {
            await transaction.run(
              `
                MATCH (group:Group {id: $groupId})-[previousRelations:CATEGORIZED]->(:Category)
                DELETE previousRelations
              `,
              { groupId },
            )
          }
          let updateGroupCypher = `
            MATCH (group:Group {id: $groupId})
            SET group += $params
            SET group.updatedAt = toString(datetime())
            WITH group
          `
          if (policy.get('categoriesActive') && categoryIds?.length) {
            updateGroupCypher += `
              UNWIND $categoryIds AS categoryId
              MATCH (category:Category {id: categoryId})
              MERGE (group)-[:CATEGORIZED]->(category)
              WITH group
            `
          }
          updateGroupCypher += `
            OPTIONAL MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group)
            RETURN group {.*, myRole: membership.role}
          `
          const transactionResponse = await transaction.run(updateGroupCypher, {
            groupId,
            userId: context.user.id,
            categoryIds,
            params,
          })
          const [group] = transactionResponse.records.map((record) => record.get('group'))
          if (params.groupType && params.groupType !== previousGroupType) {
            if (params.groupType === 'public') {
              await transaction.run(
                `
                  MATCH (user:User)-[r:CANNOT_SEE]->(post:Post)-[:IN]->(group:Group {id: $groupId})
                  DELETE r
                `,
                { groupId },
              )
            } else {
              await transaction.run(
                `
                  MATCH (group:Group {id: $groupId})<-[:IN]-(post:Post)
                  OPTIONAL MATCH (member:User)-[m:MEMBER_OF]->(group)
                    WHERE m.role IN ['usual', 'admin', 'owner']
                  WITH post, collect(member.id) AS memberIds
                  MATCH (user:User) WHERE NOT user.id IN memberIds
                  MERGE (user)-[:CANNOT_SEE]->(post)
                `,
                { groupId },
              )
            }
          }
          if (avatarInput) {
            await images(context.config).mergeImage(group, 'AVATAR_IMAGE', avatarInput, {
              transaction,
            })
          }
          return group
        })
        // TODO: put in a middleware, see "CreateGroup", "UpdateUser"
        await createOrUpdateLocations('Group', params.id, params.locationName, session, context)
        if ('showMembers' in params) {
          void context.pubsub.publish(GROUP_SHOW_MEMBERS_CHANGED, {
            groupShowMembersChanged: { groupId },
          })
        }
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw error
      } finally {
        await session.close()
      }
    },
    JoinGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId } = params
      const session = context.driver.session()
      try {
        const result = await session.writeTransaction(async (transaction) => {
          const joinGroupCypher = `
            MATCH (user:User {id: $userId}), (group:Group {id: $groupId})
            MERGE (user)-[membership:MEMBER_OF]->(group)
            ON CREATE SET
              membership.createdAt = toString(datetime()),
              membership.updatedAt = toString(datetime()),
              membership.role =
                CASE WHEN group.groupType = 'public'
                  THEN 'usual'
                  ELSE 'pending'
                  END
            RETURN user {.*}, membership {.*}
          `
          const transactionResponse = await transaction.run(joinGroupCypher, { groupId, userId })
          const records = transactionResponse.records.map((record) => {
            return { user: record.get('user'), membership: record.get('membership') }
          })
          // Add user to group chat room if they are an active member (not pending)
          if (records[0]?.membership?.role && records[0].membership.role !== 'pending') {
            await addUserToGroupChatRoom(transaction, groupId, userId)
          }
          return records
        })
        if (!result[0]) {
          throw new UserInputError('Could not find User or Group')
        }
        return result[0]
      } finally {
        await session.close()
      }
    },
    LeaveGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId } = params
      const session = context.driver.session()
      try {
        return await removeUserFromGroupWriteTxResultPromise(session, groupId, userId)
      } finally {
        await session.close()
      }
    },
    ChangeGroupMemberRole: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId, roleInGroup } = params
      const session = context.driver.session()
      try {
        return await session.writeTransaction(async (transaction) => {
          let postRestrictionCypher = ''
          if (['usual', 'admin', 'owner'].includes(roleInGroup)) {
            postRestrictionCypher = `
              WITH group, member, membership
              FOREACH (restriction IN [(member)-[r:CANNOT_SEE]->(:Post)-[:IN]->(group) | r] |
                DELETE restriction)`
          } else {
            postRestrictionCypher = `
              With group, member, membership
              FOREACH (post IN [(p:Post)-[:IN]->(group) | p] |
                MERGE (member)-[:CANNOT_SEE]->(post))`
          }

          const joinGroupCypher = `
            MATCH (member:User {id: $userId})
            MATCH (group:Group {id: $groupId})
            MERGE (member)-[membership:MEMBER_OF]->(group)
            ON CREATE SET
              membership.createdAt = toString(datetime()),
              membership.updatedAt = toString(datetime()),
              membership.role = $roleInGroup
            ON MATCH SET
              membership.updatedAt = toString(datetime()),
              membership.role = $roleInGroup
            ${postRestrictionCypher}
            RETURN member {.*} as user, membership {.*}
          `

          const transactionResponse = await transaction.run(joinGroupCypher, {
            groupId,
            userId,
            roleInGroup,
          })
          const [member] = transactionResponse.records.map((record) => {
            return { user: record.get('user'), membership: record.get('membership') }
          })
          // Manage group chat room membership based on role
          if (['usual', 'admin', 'owner'].includes(roleInGroup)) {
            await addUserToGroupChatRoom(transaction, groupId, userId)
          } else {
            await removeUserFromGroupChatRoom(transaction, groupId, userId)
          }
          return member
        })
      } finally {
        await session.close()
      }
    },
    RemoveUserFromGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId } = params
      const session = context.driver.session()
      try {
        return await removeUserFromGroupWriteTxResultPromise(session, groupId, userId)
      } finally {
        await session.close()
      }
    },
    muteGroup: async (_parent, params, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      const { groupId } = params
      const userId = context.user.id
      const session = context.driver.session()
      try {
        return await session.writeTransaction(async (transaction) => {
          const transactionResponse = await transaction.run(
            `
              MATCH (group:Group { id: $groupId })
              MATCH (user:User { id: $userId })
              MERGE (user)-[m:MUTED]->(group)
              SET m.createdAt = toString(datetime())
              RETURN group { .* }
            `,
            {
              groupId,
              userId,
            },
          )
          const [group] = transactionResponse.records.map((record) => record.get('group'))
          return group
        })
      } finally {
        await session.close()
      }
    },
    setGroupMembershipVisibility: async (_parent, params, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      const { groupId, showOnProfile } = params
      const userId = context.user.id
      const session = context.driver.session()
      try {
        return await session.writeTransaction(async (transaction) => {
          const result = await transaction.run(
            `
              MATCH (user:User {id: $userId})-[membership:MEMBER_OF]->(group:Group {id: $groupId})
              WHERE membership.role IN ['usual', 'admin', 'owner']
              SET membership.showOnProfile = $showOnProfile
              SET membership.updatedAt = toString(datetime())
              RETURN membership {.*}
            `,
            { userId, groupId, showOnProfile },
          )
          const [membership] = result.records.map((r) => r.get('membership'))
          if (!membership) {
            throw new UserInputError('User is not a member of this group')
          }
          void context.pubsub.publish(GROUP_MEMBERSHIP_VISIBILITY_CHANGED, {
            groupMembershipVisibilityChanged: { userId },
          })
          return membership
        })
      } finally {
        await session.close()
      }
    },
    unmuteGroup: async (_parent, params, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      const { groupId } = params
      const userId = context.user.id
      const session = context.driver.session()
      try {
        return await session.writeTransaction(async (transaction) => {
          const transactionResponse = await transaction.run(
            `
              MATCH (group:Group { id: $groupId })
              MATCH (user:User { id: $userId })
              OPTIONAL MATCH (user)-[m:MUTED]->(group)
              DELETE m
              RETURN group { .* }
            `,
            {
              groupId,
              userId,
            },
          )
          const [group] = transactionResponse.records.map((record) => record.get('group'))
          return group
        })
      } finally {
        await session.close()
      }
    },
  },
  User: {
    groups: async (parent, args, context: Context, _resolveInfo) => {
      // Server-side enforcement of the groups gate: with the feature off, a profile exposes
      // no groups at all (data minimisation), rather than relying on the webapp to hide the
      // list. Mirrors the socialMedia field gate.
      if (!context.policy.getEffective('groupsEnabled')) return []
      const profileUserId = parent.id
      const viewerId = context.user?.id
      const isOwnProfile = profileUserId === viewerId
      const first = args.first ?? 10
      const offset = args.offset ?? 0
      const session = context.driver.session()
      try {
        return await session.readTransaction(async (txc) => {
          let cypher: string
          if (isOwnProfile) {
            cypher = `
              MATCH (profileUser:User {id: $profileUserId})-[membership:MEMBER_OF]->(group:Group)
              WHERE membership.role IN ['usual', 'admin', 'owner']
              RETURN group {.*, myRole: membership.role, showOnProfile: coalesce(membership.showOnProfile, true)}
              ORDER BY group.groupType ASC, group.createdAt DESC
              SKIP toInteger($offset) LIMIT toInteger($first)
            `
          } else {
            cypher = `
              MATCH (profileUser:User {id: $profileUserId})-[membership:MEMBER_OF]->(group:Group)
              WHERE membership.role IN ['usual', 'admin', 'owner']
                AND coalesce(membership.showOnProfile, true) = true
              OPTIONAL MATCH (viewer:User {id: $viewerId})-[viewerMembership:MEMBER_OF]->(group)
              WITH profileUser, membership, group, viewerMembership
              WHERE (
                (group.groupType = 'public' AND coalesce(profileUser.showPublicGroupsOnProfile, true) = true)
                OR (group.groupType = 'closed' AND coalesce(profileUser.showClosedGroupsOnProfile, true) = true)
                OR (
                  group.groupType = 'hidden'
                  AND coalesce(profileUser.showHiddenGroupsOnProfile, true) = true
                  AND viewerMembership IS NOT NULL
                  AND viewerMembership.role IN ['usual', 'admin', 'owner']
                )
              )
              RETURN group {.*, myRole: viewerMembership.role, showOnProfile: coalesce(membership.showOnProfile, true)}
              ORDER BY
                CASE WHEN viewerMembership IS NOT NULL AND viewerMembership.role IN ['usual', 'admin', 'owner'] THEN 0 ELSE 1 END ASC,
                group.createdAt DESC
              SKIP toInteger($offset) LIMIT toInteger($first)
            `
          }
          const result = await txc.run(cypher, { profileUserId, viewerId, first, offset })
          return result.records.map((r) => r.get('group'))
        })
      } finally {
        await session.close()
      }
    },
  },
  Group: {
    myRole: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.id) {
        throw new Error('Can not identify selected Group!')
      }
      return (
        await context.database.query({
          query: `
        MATCH (:User {id: $user.id})-[membership:MEMBER_OF]->(group:Group {id: $parent.id})
        RETURN membership.role as role
        `,
          variables: {
            user: context.user,
            parent,
          },
        })
      ).records.map((r) => r.get('role'))[0]
    },
    inviteCodes: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.id) {
        throw new Error('Can not identify selected Group!')
      }
      return (
        await context.database.query({
          query: `
          MATCH (user:User {id: $user.id})-[:GENERATED]->(inviteCodes:InviteCode)-[:INVITES_TO]->(g:Group {id: $parent.id})
          RETURN inviteCodes {.*}
          ORDER BY inviteCodes.createdAt ASC
          `,
          variables: {
            user: context.user,
            parent,
          },
        })
      ).records.map((r) => r.get('inviteCodes'))
    },
    postsCount: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.id) {
        throw new Error('Can not identify selected Group!')
      }
      const result = await context.database.query({
        query: `
          MATCH (post:Post)-[:IN]->(:Group {id: $group.id})
          WHERE NOT post.deleted AND NOT post.disabled
          RETURN toString(count(post)) as count`,
        variables: { group: parent },
      })
      return result.records[0].get('count')
    },
    currentlyPinnedPostsCount: async (parent, _args, context: Context, _resolveInfo) => {
      if (!parent.id) {
        throw new Error('Can not identify selected Group!')
      }
      const result = await context.database.query({
        query: `
          MATCH (:User)-[pinned:GROUP_PINNED]->(pinnedPosts:Post)-[:IN]->(:Group {id: $group.id})
          RETURN toString(count(pinnedPosts)) as count`,
        variables: { group: parent },
      })
      return result.records[0].get('count')
    },
    ...Resolver('Group', {
      undefinedToNull: ['deleted', 'disabled', 'locationName', 'about'],
      hasMany: {
        categories: '-[:CATEGORIZED]->(related:Category)',
        posts: '<-[:IN]-(related:Post)',
      },
      hasOne: {
        avatar: '-[:AVATAR_IMAGE]->(related:Image)',
        location: '-[:IS_IN]->(related:Location)',
      },
      boolean: {
        isMutedByMe:
          'MATCH (this) RETURN EXISTS( (this)<-[:MUTED]-(:User {id: $cypherParams.currentUserId}) )',
      },
    }),
    membersCount: async (parent, _args, context: Context, _resolveInfo) => {
      if (typeof parent.membersCount !== 'undefined') return parent.membersCount
      const session = context.driver.session()
      try {
        return await session.readTransaction(async (txc) => {
          const cypher = `
            MATCH (:Group {id: $id})<-[membership:MEMBER_OF]-(:User)
            WHERE membership.role <> 'pending'
            RETURN COUNT(membership) as count
          `
          const result = await txc.run(cypher, { id: parent.id })
          const [response] = result.records.map((r) => r.get('count').toNumber())
          return response
        })
      } finally {
        await session.close()
      }
    },
    name: async (parent, _args, context: Context, _resolveInfo) => {
      if (!context.user) {
        return parent.groupType === 'hidden' ? '' : parent.name
      }
      return parent.name
    },
    about: async (parent, _args, context: Context, _resolveInfo) => {
      if (!context.user) {
        return parent.groupType === 'hidden' ? '' : parent.about
      }
      return parent.about
    },
    showMembers: (parent) => {
      if (parent.groupType === 'public') return true
      if (parent.groupType === 'hidden') return false
      // closed: configurable by owner; default false when property not yet set on the node
      return (parent.showMembers as boolean) ?? false
    },
  },
  Subscription: {
    groupMembershipVisibilityChanged: {
      subscribe: withFilter(
        (_parent, _args, context: Context) =>
          context.pubsub.asyncIterator(GROUP_MEMBERSHIP_VISIBILITY_CHANGED),
        (
          payload: { groupMembershipVisibilityChanged: { userId: string } },
          args: { userId: string },
          context: Context,
        ) => {
          if (!context.user) return false
          // Subscriptions bypass the permissionsMiddleware shield (it gates only
          // Query/Mutation), so the groups feature gate must be re-applied here — otherwise
          // group events keep flowing while groupsEnabled is off.
          if (!context.policy.getEffective('groupsEnabled')) return false
          return payload.groupMembershipVisibilityChanged.userId === args.userId
        },
      ),
    },
    groupShowMembersChanged: {
      subscribe: withFilter(
        (_parent, _args, context: Context) =>
          context.pubsub.asyncIterator(GROUP_SHOW_MEMBERS_CHANGED),
        (
          payload: { groupShowMembersChanged: { groupId: string } },
          args: { groupId: string },
          context: Context,
        ) => {
          if (!context.user) return false
          // See groupMembershipVisibilityChanged: the shield does not cover Subscriptions,
          // so re-gate on groupsEnabled here so no group events leak while the feature is off.
          if (!context.policy.getEffective('groupsEnabled')) return false
          return payload.groupShowMembersChanged.groupId === args.groupId
        },
      ),
    },
  },
}

const addUserToGroupChatRoom = async (transaction, groupId, userId) => {
  await transaction.run(
    `
    OPTIONAL MATCH (room:Room)-[:ROOM_FOR]->(group:Group {id: $groupId})
    WITH room
    WHERE room IS NOT NULL
    MATCH (user:User {id: $userId})
    MERGE (user)-[:CHATS_IN]->(room)
    `,
    { groupId, userId },
  )
}

const removeUserFromGroupChatRoom = async (transaction, groupId, userId) => {
  await transaction.run(
    `
    OPTIONAL MATCH (user:User {id: $userId})-[chatsIn:CHATS_IN]->(room:Room)-[:ROOM_FOR]->(group:Group {id: $groupId})
    DELETE chatsIn
    `,
    { groupId, userId },
  )
}

const removeUserFromGroupWriteTxResultPromise = async (session, groupId, userId) => {
  return session.writeTransaction(async (transaction) => {
    const removeUserFromGroupCypher = `
      MATCH (user:User {id: $userId})-[membership:MEMBER_OF]->(group:Group {id: $groupId})
      DELETE membership
      WITH user, group
      OPTIONAL MATCH (author:User)-[:WROTE]->(p:Post)-[:IN]->(group)
      WHERE NOT group.groupType = 'public'
        AND NOT author.id = $userId
      WITH user, collect(p) AS posts
      FOREACH (post IN posts |
        MERGE (user)-[:CANNOT_SEE]->(post))
      RETURN user {.*}, NULL as membership
    `

    const transactionResponse = await transaction.run(removeUserFromGroupCypher, {
      groupId,
      userId,
    })
    const [result] = transactionResponse.records.map((record) => {
      return { user: record.get('user'), membership: record.get('membership') }
    })
    if (!result) {
      throw new UserInputError('User is not a member of this group')
    }
    // Remove user from group chat room
    await removeUserFromGroupChatRoom(transaction, groupId, userId)
    return result
  })
}

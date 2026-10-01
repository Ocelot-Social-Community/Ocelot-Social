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

import {
  GROUP_MEMBERSHIP_VISIBILITY_CHANGED,
  GROUP_PERMISSIONS_CHANGED,
  GROUP_SHOW_MEMBERS_CHANGED,
} from '@constants/subscriptions'
import { ForbiddenError, UserInputError } from '@graphql/errors'
import { removeHtmlTags } from '@middleware/helpers/cleanHtml'
import { branding } from '@src/branding'
import { NONE_ROLE, PENDING_ROLE, USUAL_ROLE } from '@src/groupRole'
import {
  applyGroupTypeToNonMemberRoles,
  readGroupRoles,
  seedRolesForNewGroup,
  setNonMemberMemberListAccess,
} from '@src/groupRole/repository'

import { nonMemberReadsGroup, nonMemberReadsMembers } from './helpers/groupAccessCypher'
import Resolver from './helpers/Resolver'
import { groupReadScope } from './helpers/viewerGroups'
import { images } from './images/images'
import {
  createOrUpdateLocations,
  extractCoordinates,
  NEIGHBORHOOD_REVERSE_GEOCODE_TYPES,
} from './users/location'

import type { Context } from '@src/context'

// Reverse-geocoded with these types (see createOrUpdateLocations) instead of
// an event's precise address/poi/place — a group's location is deliberately
// coarser than an event's exact pin (see NEIGHBORHOOD_REVERSE_GEOCODE_TYPES'
// own doc comment for the full reasoning).
const GROUP_REVERSE_GEOCODE_TYPES = NEIGHBORHOOD_REVERSE_GEOCODE_TYPES

// Pulls lat/lng off params (so they never reach `SET group += $params` below
// — a group has no lat/lng fields of its own, unlike Post) and validates
// them, mirroring validateEventParams' own coordinate check. Returns null
// when neither was given; throws when only one was, or either is out of
// range. Thin wrapper around the shared extractCoordinates (see
// users/location.ts) — User's own UpdateUser resolver uses the same
// function directly with its own entity label.
const extractGroupCoordinates = (params): { lat: number; lng: number } | null =>
  extractCoordinates(params, 'Group')

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

// One generated cypher-field resolver, as the overrides below need to call it.
type GroupFieldResolver = (
  parent: Record<string, unknown>,
  args: unknown,
  context: Context,
  info: unknown,
) => Promise<unknown>

// The generated cypher-field resolvers for Group, captured so the gated overrides below can
// delegate to them instead of reimplementing the traversal. `Resolver()` builds its map
// dynamically and is declared as returning `{}`, so the three fields that get a gate are named
// here — the rest is spread as it comes.
const groupCypherFields = Resolver('Group', {
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
}) as Record<string, unknown> & {
  categories: GroupFieldResolver
  location: GroupFieldResolver
  posts: GroupFieldResolver
}

/**
 * May this viewer read the group's profile (`group.read`) / its content (`group.content.read`)?
 *
 * The fields below BLANK rather than refuse. A shield rule would be the shorter way to say it,
 * but it would also be the wrong answer for the one list where a group a viewer may not read
 * legitimately appears: their own. An applicant to a hidden group has to see that they applied,
 * and several of these fields are non-null — a refusal there nulls the whole group out of the
 * list and reports it as an error, where an empty description simply reads as "nothing to see".
 *
 * The optional call is for the unit tests that hand in a partial context; a real request always
 * carries the scope, and without one these fields behave as they did before the rights existed.
 */
const mayReadGroup = async (parent: { id?: string }, context: Context): Promise<boolean> => {
  if (!context.groupAuthorization) {
    return true
  }
  const authorization = await context.groupAuthorization.forGroup(parent.id as string)
  return !!authorization?.has('group.read')
}

const mayReadGroupContent = async (parent: { id?: string }, context: Context): Promise<boolean> => {
  if (!context.groupAuthorization) {
    return true
  }
  const authorization = await context.groupAuthorization.forGroup(parent.id as string)
  return !!authorization?.has('group.content.read')
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
          if (id !== undefined) {
            matchFilters.push('group.id = $id')
          }
          if (slug !== undefined) {
            matchFilters.push('group.slug = $slug')
          }
          const matchWhere = matchFilters.length ? `WHERE ${matchFilters.join(' AND ')}` : ''

          const locationMatch = hasLocation === true ? 'MATCH (group)-[:IS_IN]->(:Location)' : ''

          // Which groups the viewer may see is `group.read`, from two directions: the group
          // opened its profile to non-members (mirrored onto the node as `nonMemberRead` — see
          // groupRole/nonMemberAccess.ts, the only shape a many-groups filter can use), or the
          // viewer's own role in that group grants it. The group TYPE appears only in the
          // coalesce fallback, for a node the backfill migration has not reached yet.
          //
          // `isMember: true` is the exception: that list is "the groups I am in", so a
          // MEMBERSHIP is what qualifies, not a right. An applicant to a hidden group has to
          // be able to see that they applied — the group's own fields stay blank for them,
          // which the field resolvers below take care of.
          const { readableGroupIds } = await groupReadScope(context)
          const readableByStranger = nonMemberReadsGroup('group')
          const readableByViewer = 'group.id IN $readableGroupIds'

          const transactionResponse = await txc.run(
            `
            MATCH (group:Group)
            ${matchWhere}
            ${locationMatch}
            OPTIONAL MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group)
            WITH group, membership
            ${(isMember === true && 'WHERE membership IS NOT NULL') || ''}
            ${(isMember === false && `WHERE membership IS NULL AND ${readableByStranger}`) || ''}
            ${(isMember === undefined && `WHERE ${readableByViewer} OR ${readableByStranger}`) || ''}
            RETURN group {.*, myRole: membership.role, showOnProfile: coalesce(membership.showOnProfile, true)}
            ORDER BY group.createdAt DESC
            ${first !== undefined && offset !== undefined ? 'SKIP toInteger($offset) LIMIT toInteger($first)' : ''}
          `,
            {
              userId: context.user.id,
              readableGroupIds,
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
             WHERE m.role <> 'pending'
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
              WHERE ${nonMemberReadsMembers('group')}
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
      const { readableGroupIds } = await groupReadScope(context as Context)
      const session = context.driver.session()
      try {
        const result = await session.readTransaction(async (txc) => {
          let cypher
          if (isMember) {
            cypher = `MATCH (user:User)-[membership:MEMBER_OF]->(group:Group)
                      WHERE user.id = $userId
                      AND membership IS NOT NULL
                      RETURN toString(count(group)) AS count`
          } else {
            // The same two directions as the Group query itself — the group's own
            // `nonMemberRead` or the viewer's role — so the count cannot disagree with the
            // list it is counting.
            cypher = `MATCH (group:Group)
                      WHERE group.id IN $readableGroupIds
                      OR ${nonMemberReadsGroup('group')}
                      RETURN toString(count(group)) AS count`
          }
          const transactionResponse = await txc.run(cypher, { userId, readableGroupIds })
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
      const coordinates = extractGroupCoordinates(params)
      // Only require categories when the feature is on AND at least one category
      // exists — otherwise group creation would be impossible on an empty
      // category DB (mirrors the frontend gating in getCategoriesMixin).
      const enforceCategories = policy.get('categoriesActive') && (await categoriesExist(context))
      if (enforceCategories && (!categoryIds || categoryIds.length < branding.category.min)) {
        throw new UserInputError('Too few categories!')
      }
      if (
        policy.get('categoriesActive') &&
        categoryIds &&
        categoryIds.length > branding.category.max
      ) {
        throw new UserInputError('Too many categories!')
      }
      if (
        params.description === undefined ||
        params.description === null ||
        removeHtmlTags(params.description).length < branding.group.descriptionMinLength
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
          // The group's own role definitions, copied from the network template for its type.
          // In the same transaction as the group itself: a group without roles is a group
          // nobody can act in, so the two commit together or not at all.
          await seedRolesForNewGroup(
            transaction,
            params.id,
            params.groupType,
            new Date().toISOString(),
          )
          return group
        })
        // TODO: put in a middleware, see "UpdateGroup", "UpdateUser"
        await createOrUpdateLocations(
          'Group',
          params.id,
          params.locationName,
          session,
          context,
          coordinates,
          GROUP_REVERSE_GEOCODE_TYPES,
        )
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
          throw new UserInputError('Group with this slug already exists!')
        }
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
      const coordinates = extractGroupCoordinates(params)

      if (policy.get('categoriesActive') && categoryIds) {
        if (categoryIds.length < branding.category.min) {
          throw new UserInputError('Too few categories!')
        }
        if (categoryIds.length > branding.category.max) {
          throw new UserInputError('Too many categories!')
        }
      }
      if (
        params.description &&
        removeHtmlTags(params.description).length < branding.group.descriptionMinLength
      ) {
        throw new UserInputError('Description too short!')
      }
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      // Captured here rather than read after the transaction: the narrowing above does not
      // reach into the callback, and `context.user?.id ?? 'system'` would be a second answer
      // to a question the shield has already settled.
      const actor = context.user.id
      const session = context.driver.session()
      // Read inside the transaction below, used after it: switching the type has to be
      // translated into the roles that carry it (see applyGroupTypeToNonMemberRoles), and that
      // needs to know whether the type actually changed.
      let previousGroupType: string | undefined
      try {
        const group = await session.writeTransaction(async (transaction) => {
          const previousGroupTypeResult = await transaction.run(
            `MATCH (group:Group {id: $groupId}) RETURN group.groupType AS groupType`,
            { groupId },
          )
          previousGroupType = previousGroupTypeResult.records[0]?.get('groupType') as
            string | undefined
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
            userId: actor,
            categoryIds,
            params,
          })
          const [group] = transactionResponse.records.map((record) => record.get('group'))
          // Changing groupType used to rewrite the stored restrictions here: delete every
          // CANNOT_SEE edge into the group on the way to `public`, and on the way back write
          // one edge per (post × non-member) — a cartesian product in a single write
          // transaction, 500.000 rows for a 100-post group on a 5.000-user instance.
          // `SET group += $params` above is now the whole change; the visibility rule reads
          // groupType at query time, so every post in the group flips with it, atomically.
          if (avatarInput) {
            await images(context.config).mergeImage(group, 'AVATAR_IMAGE', avatarInput, {
              transaction,
            })
          }
          return group
        })
        // TODO: put in a middleware, see "CreateGroup", "UpdateUser"
        await createOrUpdateLocations(
          'Group',
          params.id,
          params.locationName,
          session,
          context,
          coordinates,
          GROUP_REVERSE_GEOCODE_TYPES,
        )
        if (params.groupType && params.groupType !== previousGroupType) {
          // The type is a preset for what outsiders may do, so switching it writes those
          // rights. Nothing reads groupType for visibility any more — which is why the switch
          // has to land in the `none` and `pending` roles to have any effect at all.
          await applyGroupTypeToNonMemberRoles(
            context.database,
            groupId,
            params.groupType as string,
            actor,
            new Date().toISOString(),
          )
          void context.pubsub.publish(GROUP_PERMISSIONS_CHANGED, {
            groupPermissionsChanged: { groupId },
          })
        }
        if ('showMembers' in params) {
          // Keep the right and the (deprecated) property in step: the property is what older
          // clients still read, the right is what actually decides.
          await setNonMemberMemberListAccess(
            context.database,
            groupId,
            params.showMembers === true,
            new Date().toISOString(),
          )
          void context.pubsub.publish(GROUP_SHOW_MEMBERS_CHANGED, {
            groupShowMembersChanged: { groupId },
          })
        }
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
          throw new UserInputError('Group with this slug already exists!')
        }
        throw error
      } finally {
        await session.close()
      }
    },
    JoinGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId } = params
      // Where the membership lands follows the RIGHT, not the group type: someone who holds
      // group.join enters as a member, someone who only holds group.join.request waits as an
      // applicant. Adding another person is an act of membership management (the shield
      // required group.member.approve for it), so it lands as a member. The group type still
      // decides all of this — it just does so through the non-member role it seeded.
      const authorization = await context.groupAuthorization.forGroup(groupId)
      const joinsAsMember = context.user?.id !== userId || !!authorization?.has('group.join')
      const role = joinsAsMember ? USUAL_ROLE : PENDING_ROLE
      const session = context.driver.session()
      try {
        const result = await session.writeTransaction(async (transaction) => {
          const joinGroupCypher = `
            MATCH (user:User {id: $userId}), (group:Group {id: $groupId})
            MERGE (user)-[membership:MEMBER_OF]->(group)
            ON CREATE SET
              membership.createdAt = toString(datetime()),
              membership.updatedAt = toString(datetime()),
              membership.role = $role
            RETURN user {.*}, membership {.*}
          `
          const transactionResponse = await transaction.run(joinGroupCypher, {
            groupId,
            userId,
            role,
          })
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
          // Setting `membership.role` is the whole operation now. It used to be followed by a
          // FOREACH that deleted or created one CANNOT_SEE edge per post in the group — and
          // the two branches disagreed: the demoting one had no author exception, so losing
          // membership through a role change hid your own posts while LeaveGroup did not.
          // Reading the rule from the membership removes the branch and the disagreement.
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
          if (roleInGroup !== 'pending') {
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
              WHERE membership.role <> 'pending'
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
      if (!context.policy.getEffective('groupsEnabled')) {
        return []
      }
      const profileUserId = parent.id
      const viewerId = context.user?.id
      const isOwnProfile = profileUserId === viewerId
      const first = args.first ?? 10
      const offset = args.offset ?? 0
      const nameFilter = args.nameFilter ?? ''
      const session = context.driver.session()
      try {
        return await session.readTransaction(async (txc) => {
          let cypher: string
          if (isOwnProfile) {
            cypher = `
              MATCH (profileUser:User {id: $profileUserId})-[membership:MEMBER_OF]->(group:Group)
              WHERE membership.role <> 'pending'
                AND ($nameFilter = '' OR toLower(group.name) CONTAINS toLower($nameFilter))
              RETURN group {.*, myRole: membership.role, showOnProfile: coalesce(membership.showOnProfile, true)}
              ORDER BY group.groupType ASC, group.createdAt DESC
              SKIP toInteger($offset) LIMIT toInteger($first)
            `
          } else {
            cypher = `
              MATCH (profileUser:User {id: $profileUserId})-[membership:MEMBER_OF]->(group:Group)
              WHERE membership.role <> 'pending'
                AND coalesce(membership.showOnProfile, true) = true
                AND ($nameFilter = '' OR toLower(group.name) CONTAINS toLower($nameFilter))
              OPTIONAL MATCH (viewer:User {id: $viewerId})-[viewerMembership:MEMBER_OF]->(group)
              WITH profileUser, membership, group, viewerMembership
              WHERE (
                (group.groupType = 'public' AND coalesce(profileUser.showPublicGroupsOnProfile, true) = true)
                OR (group.groupType = 'closed' AND coalesce(profileUser.showClosedGroupsOnProfile, true) = true)
                OR (
                  group.groupType = 'hidden'
                  AND coalesce(profileUser.showHiddenGroupsOnProfile, true) = true
                  AND viewerMembership IS NOT NULL
                  AND viewerMembership.role <> 'pending'
                )
              )
              RETURN group {.*, myRole: viewerMembership.role, showOnProfile: coalesce(membership.showOnProfile, true)}
              ORDER BY
                CASE WHEN viewerMembership IS NOT NULL AND viewerMembership.role <> 'pending' THEN 0 ELSE 1 END ASC,
                group.createdAt DESC
              SKIP toInteger($offset) LIMIT toInteger($first)
            `
          }
          const result = await txc.run(cypher, {
            profileUserId,
            viewerId,
            first,
            offset,
            nameFilter,
          })
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
      // Counting the posts is reading the content (concept E7), the same way counting members
      // is reading the member list. Null rather than an error, so a teaser renders.
      if (!(await mayReadGroupContent(parent, context))) {
        return null
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
    ...groupCypherFields,
    // The three generated fields that are part of the group's PROFILE and its CONTENT rather
    // than of its identity. Each delegates to the generated resolver when the viewer may read,
    // and otherwise answers empty — never refuses, for the reason given at mayReadGroup.
    categories: async (parent, args, context: Context, info) =>
      (await mayReadGroup(parent, context))
        ? groupCypherFields.categories(parent, args, context, info)
        : [],
    location: async (parent, args, context: Context, info) =>
      (await mayReadGroup(parent, context))
        ? groupCypherFields.location(parent, args, context, info)
        : null,
    posts: async (parent, args, context: Context, info) =>
      (await mayReadGroupContent(parent, context))
        ? groupCypherFields.posts(parent, args, context, info)
        : [],
    description: async (parent, _args, context: Context) =>
      (await mayReadGroup(parent, context)) ? parent.description : '',
    locationName: async (parent, _args, context: Context) =>
      (await mayReadGroup(parent, context)) ? parent.locationName : null,
    ownerCount: async (parent, _args, context: Context, _resolveInfo) => {
      // Carried along by the admin list query; counted on demand elsewhere. Behind the same
      // right as the member list: it is a fact about the members.
      if (typeof parent.ownerCount === 'number') {
        return parent.ownerCount
      }
      const authorization = await context.groupAuthorization?.forGroup(parent.id as string)
      if (context.groupAuthorization && !authorization?.has('group.members.read')) {
        return null
      }
      const result = await context.database.query({
        query: `MATCH (:User)-[m:MEMBER_OF]->(:Group {id: $id})
                WHERE m.role = 'owner'
                RETURN toString(count(m)) AS count`,
        variables: { id: parent.id },
      })
      return Number.parseInt((result.records[0]?.get('count') as string) ?? '0', 10)
    },
    membersCount: async (parent, _args, context: Context, _resolveInfo) => {
      // Counting members is part of seeing them (concept E7). Null rather than an error: a
      // viewer who may not count is a normal case on a group teaser, not a fault.
      //
      // The optional call is for the unit tests that hand in a partial context: a real request
      // always carries the scope (getContext builds it), and without one this field behaves as
      // it did before the right existed rather than crashing.
      const authorization = await context.groupAuthorization?.forGroup(parent.id)
      if (context.groupAuthorization && !authorization?.has('group.members.read')) {
        return null
      }
      if (typeof parent.membersCount !== 'undefined') {
        return parent.membersCount
      }
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
      // Part of the profile, so it follows `group.read`. For everybody who may read the group
      // — which includes every stranger to a public or closed one — this is just `parent.about`
      // as before.
      return (await mayReadGroup(parent, context)) ? parent.about : ''
    },
    showMembers: async (parent, _args, context: Context) => {
      // "Non-members may see the member list" IS the non-member role holding group.members.read;
      // the setting was only ever a second way of saying it. Read from the role so the two can
      // never disagree, with the old property as the fallback for a group whose roles are not
      // seeded yet (a database mid-migration).
      // Same tolerance as membersCount above for a partial context in a unit test.
      const roles = context.database
        ? await readGroupRoles(context.database, parent.id as string)
        : []
      const none = roles.find((role) => role.name === NONE_ROLE)
      if (none) {
        return none.permissions.includes('group.members.read')
      }
      if (parent.groupType === 'public') {
        return true
      }
      if (parent.groupType === 'hidden') {
        return false
      }
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
          if (!context.user) {
            return false
          }
          // Subscriptions bypass the permissionsMiddleware shield (it gates only
          // Query/Mutation), so the groups feature gate must be re-applied here — otherwise
          // group events keep flowing while groupsEnabled is off.
          if (!context.policy.getEffective('groupsEnabled')) {
            return false
          }
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
          if (!context.user) {
            return false
          }
          // See groupMembershipVisibilityChanged: the shield does not cover Subscriptions,
          // so re-gate on groupsEnabled here so no group events leak while the feature is off.
          if (!context.policy.getEffective('groupsEnabled')) {
            return false
          }
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
    // Deleting the membership is the whole operation. The FOREACH that used to follow wrote
    // one CANNOT_SEE edge per post in the group, skipping the ones this user wrote — that
    // `NOT author.id = $userId` was the only place the author exception existed. It is part of
    // the visibility rule itself now, so it applies to every way of losing membership instead
    // of just this one.
    const removeUserFromGroupCypher = `
      MATCH (user:User {id: $userId})-[membership:MEMBER_OF]->(group:Group {id: $groupId})
      DELETE membership
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

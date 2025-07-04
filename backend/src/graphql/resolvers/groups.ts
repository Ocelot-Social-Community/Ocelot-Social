/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UserInputError } from 'apollo-server'
import { v4 as uuid } from 'uuid'

import { CATEGORIES_MIN, CATEGORIES_MAX } from '@constants/categories'
import { DESCRIPTION_WITHOUT_HTML_LENGTH_MIN } from '@constants/groups'
import { removeHtmlTags } from '@middleware/helpers/cleanHtml'
import type { Context } from '@src/context'

import Resolver, {
  removeUndefinedNullValuesFromObject,
  convertObjectToCypherMapLiteral,
} from './helpers/Resolver'
import { images } from './images/images'
import { createOrUpdateLocations } from './users/location'

export default {
  Query: {
    Group: async (_object, params, context: Context, _resolveInfo) => {
      const { isMember, id, slug, first, offset } = params
      let pagination = ''
      const orderBy = 'ORDER BY group.createdAt DESC'
      if (first !== undefined && offset !== undefined) pagination = `SKIP ${offset} LIMIT ${first}`
      const matchParams = { id, slug }
      removeUndefinedNullValuesFromObject(matchParams)
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        if (!context.user) {
          throw new Error('Missing authenticated user.')
        }
        const groupMatchParamsCypher = convertObjectToCypherMapLiteral(matchParams, true)
        let groupCypher
        if (isMember === true) {
          groupCypher = `
            MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group:Group${groupMatchParamsCypher})
            WITH group, membership
            WHERE (group.groupType IN ['public', 'closed']) OR (group.groupType = 'hidden' AND membership.role IN ['usual', 'admin', 'owner'])
            RETURN group {.*, myRole: membership.role}
            ${orderBy}
            ${pagination}
          `
        } else {
          if (isMember === false) {
            groupCypher = `
              MATCH (group:Group${groupMatchParamsCypher})
              WHERE (NOT (:User {id: $userId})-[:MEMBER_OF]->(group))
              WITH group
              WHERE group.groupType IN ['public', 'closed']
              RETURN group {.*, myRole: NULL}
              ${orderBy}
              ${pagination}
            `
          } else {
            groupCypher = `
              MATCH (group:Group${groupMatchParamsCypher})
              OPTIONAL MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group)
              WITH group, membership
              WHERE (group.groupType IN ['public', 'closed']) OR (group.groupType = 'hidden' AND membership.role IN ['usual', 'admin', 'owner'])
              RETURN group {.*, myRole: membership.role}
              ${orderBy}
              ${pagination}
            `
          }
        }
        const transactionResponse = await txc.run(groupCypher, {
          userId: context.user.id,
        })
        return transactionResponse.records.map((record) => record.get('group'))
      })
      try {
        return await readTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        await session.close()
      }
    },
    GroupMembers: async (_object, params, context: Context, _resolveInfo) => {
      const { id: groupId, first = 25, offset = 0 } = params
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const groupMemberCypher = `
          MATCH (user:User)-[membership:MEMBER_OF]->(:Group {id: $groupId})
          RETURN user {.*, myRoleInGroup: membership.role}
          SKIP toInteger($offset) LIMIT toInteger($first)
        `
        const transactionResponse = await txc.run(groupMemberCypher, {
          groupId,
          first,
          offset,
        })
        return transactionResponse.records.map((record) => record.get('user'))
      })
      try {
        return await readTxResultPromise
      } catch (error) {
        throw new Error(error)
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
      const readTxResultPromise = session.readTransaction(async (txc) => {
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
        return transactionResponse.records.map((record) => record.get('count'))
      })
      try {
        return parseInt(await readTxResultPromise)
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
  },
  Mutation: {
    CreateGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { config } = context
      const { categoryIds } = params
      delete params.categoryIds
      params.locationName = params.locationName === '' ? null : params.locationName
      if (config.CATEGORIES_ACTIVE && (!categoryIds || categoryIds.length < CATEGORIES_MIN)) {
        throw new UserInputError('Too few categories!')
      }
      if (config.CATEGORIES_ACTIVE && categoryIds && categoryIds.length > CATEGORIES_MAX) {
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
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        if (!context.user) {
          throw new Error('Missing authenticated user.')
        }
        const categoriesCypher =
          config.CATEGORIES_ACTIVE && categoryIds
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
              membership.updatedAt = null,
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
      try {
        const group = await writeTxResultPromise
        // TODO: put in a middleware, see "UpdateGroup", "UpdateUser"
        await createOrUpdateLocations('Group', params.id, params.locationName, session, context)
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw new Error(error)
      } finally {
        await session.close()
      }
    },
    UpdateGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { config } = context
      const { categoryIds } = params
      delete params.categoryIds
      const { id: groupId, avatar: avatarInput } = params
      delete params.avatar
      params.locationName = params.locationName === '' ? null : params.locationName

      if (config.CATEGORIES_ACTIVE && categoryIds) {
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
      if (config.CATEGORIES_ACTIVE && categoryIds && categoryIds.length) {
        const cypherDeletePreviousRelations = `
          MATCH (group:Group {id: $groupId})-[previousRelations:CATEGORIZED]->(category:Category)
          DELETE previousRelations
          RETURN group, category
        `
        await session.writeTransaction((transaction) => {
          return transaction.run(cypherDeletePreviousRelations, { groupId })
        })
      }
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        if (!context.user) {
          throw new Error('Missing authenticated user.')
        }
        let updateGroupCypher = `
          MATCH (group:Group {id: $groupId})
          SET group += $params
          SET group.updatedAt = toString(datetime())
          WITH group
        `
        if (config.CATEGORIES_ACTIVE && categoryIds && categoryIds.length) {
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
        if (avatarInput) {
          await images(context.config).mergeImage(group, 'AVATAR_IMAGE', avatarInput, {
            transaction,
          })
        }
        return group
      })
      try {
        const group = await writeTxResultPromise
        // TODO: put in a middleware, see "CreateGroup", "UpdateUser"
        await createOrUpdateLocations('Group', params.id, params.locationName, session, context)
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw new Error(error)
      } finally {
        await session.close()
      }
    },
    JoinGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId } = params
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const joinGroupCypher = `
          MATCH (member:User {id: $userId}), (group:Group {id: $groupId})
          MERGE (member)-[membership:MEMBER_OF]->(group)
          ON CREATE SET
            membership.createdAt = toString(datetime()),
            membership.updatedAt = null,
            membership.role =
              CASE WHEN group.groupType = 'public'
                THEN 'usual'
                ELSE 'pending'
                END
          RETURN member {.*, myRoleInGroup: membership.role}
        `
        const transactionResponse = await transaction.run(joinGroupCypher, { groupId, userId })
        const [member] = transactionResponse.records.map((record) => record.get('member'))
        return member
      })
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        await session.close()
      }
    },
    LeaveGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId } = params
      const session = context.driver.session()
      try {
        return await removeUserFromGroupWriteTxResultPromise(session, groupId, userId)
      } catch (error) {
        throw new Error(error)
      } finally {
        await session.close()
      }
    },
    ChangeGroupMemberRole: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId, roleInGroup } = params
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        let postRestrictionCypher = ''
        if (['usual', 'admin', 'owner'].includes(roleInGroup)) {
          postRestrictionCypher = `
            WITH group, member, membership
            FOREACH (restriction IN [(member)-[r:CANNOT_SEE]->(:Post)-[:IN]->(group) | r] |
              DELETE restriction)`
        } else {
          postRestrictionCypher = `
            WITH group, member, membership
            FOREACH (post IN [(p:Post)-[:IN]->(group) | p] |
              MERGE (member)-[:CANNOT_SEE]->(post))`
        }

        const joinGroupCypher = `
          MATCH (member:User {id: $userId})
          MATCH (group:Group {id: $groupId})
          MERGE (member)-[membership:MEMBER_OF]->(group)
          ON CREATE SET
            membership.createdAt = toString(datetime()),
            membership.updatedAt = null,
            membership.role = $roleInGroup
          ON MATCH SET
            membership.updatedAt = toString(datetime()),
            membership.role = $roleInGroup
          ${postRestrictionCypher}
          RETURN member {.*, myRoleInGroup: membership.role}
        `

        const transactionResponse = await transaction.run(joinGroupCypher, {
          groupId,
          userId,
          roleInGroup,
        })
        const [member] = transactionResponse.records.map((record) => record.get('member'))
        return member
      })
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        await session.close()
      }
    },
    RemoveUserFromGroup: async (_parent, params, context: Context, _resolveInfo) => {
      const { groupId, userId } = params
      const session = context.driver.session()
      try {
        return await removeUserFromGroupWriteTxResultPromise(session, groupId, userId)
      } catch (error) {
        throw new Error(error)
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
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        if (!context.user) {
          throw new Error('Missing authenticated user.')
        }
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
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new Error(error)
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
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const transactionResponse = await transaction.run(
          `
          MATCH (group:Group { id: $groupId })
          MATCH (user:User { id: $userId })
          OPTIONAL MATCH  (user)-[m:MUTED]->(group)
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
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        await session.close()
      }
    },
  },
  Group: {
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
      count: {
        membersCount: '<-[:MEMBER_OF]-(related:User)',
      },
    }),
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
  },
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
      RETURN user {.*, myRoleInGroup: NULL}
    `

    const transactionResponse = await transaction.run(removeUserFromGroupCypher, {
      groupId,
      userId,
    })
    const [user] = await transactionResponse.records.map((record) => record.get('user'))
    return user
  })
}

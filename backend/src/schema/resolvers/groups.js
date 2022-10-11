import { v4 as uuid } from 'uuid'
import { UserInputError } from 'apollo-server'
import CONFIG from '../../config'
import { CATEGORIES_MIN, CATEGORIES_MAX } from '../../constants/categories'
import { DESCRIPTION_WITHOUT_HTML_LENGTH_MIN } from '../../constants/groups'
import { removeHtmlTags } from '../../middleware/helpers/cleanHtml.js'
import Resolver, {
  removeUndefinedNullValuesFromObject,
  convertObjectToCypherMapLiteral,
} from './helpers/Resolver'
import { mergeImage } from './images/images'
import { createOrUpdateLocations } from './users/location'

export default {
  Query: {
    Group: async (_object, params, context, _resolveInfo) => {
      const { isMember, id, slug } = params
      const matchParams = { id, slug }
      removeUndefinedNullValuesFromObject(matchParams)
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const groupMatchParamsCypher = convertObjectToCypherMapLiteral(matchParams, true)
        let groupCypher
        if (isMember === true) {
          groupCypher = `
            MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group:Group${groupMatchParamsCypher})
            WITH group, membership
            WHERE (group.groupType IN ['public', 'closed']) OR (group.groupType = 'hidden' AND membership.role IN ['usual', 'admin', 'owner'])
            RETURN group {.*, myRole: membership.role}
          `
        } else {
          if (isMember === false) {
            groupCypher = `
              MATCH (group:Group${groupMatchParamsCypher})
              WHERE (NOT (:User {id: $userId})-[:MEMBER_OF]->(group))
              WITH group
              WHERE group.groupType IN ['public', 'closed']
              RETURN group {.*, myRole: NULL}
            `
          } else {
            groupCypher = `
              MATCH (group:Group${groupMatchParamsCypher})
              OPTIONAL MATCH (:User {id: $userId})-[membership:MEMBER_OF]->(group)
              WITH group, membership
              WHERE (group.groupType IN ['public', 'closed']) OR (group.groupType = 'hidden' AND membership.role IN ['usual', 'admin', 'owner'])
              RETURN group {.*, myRole: membership.role}
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
        session.close()
      }
    },
    GroupMembers: async (_object, params, context, _resolveInfo) => {
      const { id: groupId } = params
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const groupMemberCypher = `
          MATCH (user:User)-[membership:MEMBER_OF]->(:Group {id: $groupId})
          RETURN user {.*, myRoleInGroup: membership.role}
        `
        const transactionResponse = await txc.run(groupMemberCypher, {
          groupId,
        })
        return transactionResponse.records.map((record) => record.get('user'))
      })
      try {
        return await readTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
  },
  Mutation: {
    CreateGroup: async (_parent, params, context, _resolveInfo) => {
      const { categoryIds } = params
      delete params.categoryIds
      params.locationName = params.locationName === '' ? null : params.locationName
      if (CONFIG.CATEGORIES_ACTIVE && (!categoryIds || categoryIds.length < CATEGORIES_MIN)) {
        throw new UserInputError('Too view categories!')
      }
      if (CONFIG.CATEGORIES_ACTIVE && categoryIds && categoryIds.length > CATEGORIES_MAX) {
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
        const categoriesCypher =
          CONFIG.CATEGORIES_ACTIVE && categoryIds
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
        const [group] = await ownerCreateGroupTransactionResponse.records.map((record) =>
          record.get('group'),
        )
        return group
      })
      try {
        const group = await writeTxResultPromise
        // TODO: put in a middleware, see "UpdateGroup", "UpdateUser"
        await createOrUpdateLocations('Group', params.id, params.locationName, session)
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    UpdateGroup: async (_parent, params, context, _resolveInfo) => {
      const { categoryIds } = params
      delete params.categoryIds
      const { id: groupId, avatar: avatarInput } = params
      delete params.avatar
      params.locationName = params.locationName === '' ? null : params.locationName

      if (CONFIG.CATEGORIES_ACTIVE && categoryIds) {
        if (categoryIds.length < CATEGORIES_MIN) {
          throw new UserInputError('Too view categories!')
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
      if (CONFIG.CATEGORIES_ACTIVE && categoryIds && categoryIds.length) {
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
        let updateGroupCypher = `
          MATCH (group:Group {id: $groupId})
          SET group += $params
          SET group.updatedAt = toString(datetime())
          WITH group
        `
        if (CONFIG.CATEGORIES_ACTIVE && categoryIds && categoryIds.length) {
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
        const [group] = await transactionResponse.records.map((record) => record.get('group'))
        if (avatarInput) {
          await mergeImage(group, 'AVATAR_IMAGE', avatarInput, { transaction })
        }
        return group
      })
      try {
        const group = await writeTxResultPromise
        // TODO: put in a middleware, see "CreateGroup", "UpdateUser"
        await createOrUpdateLocations('Group', params.id, params.locationName, session)
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    JoinGroup: async (_parent, params, context, _resolveInfo) => {
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
        const [member] = await transactionResponse.records.map((record) => record.get('member'))
        return member
      })
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    LeaveGroup: async (_parent, params, context, _resolveInfo) => {
      const { groupId, userId } = params
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const leaveGroupCypher = `
          MATCH (member:User {id: $userId})-[membership:MEMBER_OF]->(group:Group {id: $groupId})
          DELETE membership
          WITH member, group
          OPTIONAL MATCH (p:Post)-[:IN]->(group)
          WHERE NOT group.groupType = 'public' 
          WITH member, group, collect(p) AS posts
          FOREACH (post IN posts |
            MERGE (member)-[:CANNOT_SEE]->(post))
          RETURN member {.*, myRoleInGroup: NULL}
        `

        const transactionResponse = await transaction.run(leaveGroupCypher, { groupId, userId })
        const [member] = await transactionResponse.records.map((record) => record.get('member'))
        return member
      })
      try {
        return await writeTxResultPromise
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    ChangeGroupMemberRole: async (_parent, params, context, _resolveInfo) => {
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
        const [member] = await transactionResponse.records.map((record) => record.get('member'))
        return member
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
  Group: {
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
    }),
  },
}

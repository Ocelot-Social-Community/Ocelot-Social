import { v4 as uuid } from 'uuid'
// Wolle: import { neo4jgraphql } from 'neo4j-graphql-js'
// Wolle: import { isEmpty } from 'lodash'
import { UserInputError } from 'apollo-server'
import CONFIG from '../../config'
// Wolle: import { mergeImage, deleteImage } from './images/images'
import Resolver from './helpers/Resolver'
// Wolle: import { filterForMutedUsers } from './helpers/filterForMutedUsers'

// Wolle: const maintainPinnedPosts = (params) => {
//   const pinnedPostFilter = { pinned: true }
//   if (isEmpty(params.filter)) {
//     params.filter = { OR: [pinnedPostFilter, {}] }
//   } else {
//     params.filter = { OR: [pinnedPostFilter, { ...params.filter }] }
//   }
//   return params
// }

export default {
  Query: {
    // Wolle: Post: async (object, params, context, resolveInfo) => {
    //   params = await filterForMutedUsers(params, context)
    //   // params = await maintainPinnedPosts(params)
    //   return neo4jgraphql(object, params, context, resolveInfo)
    // },
    Group: async (_object, _params, context, _resolveInfo) => {
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (txc) => {
        const result = await txc.run(
          `
            MATCH (user:User {id: $userId})-[membership:MEMBER_OF]->(group:Group)
            RETURN group {.*, myRole: membership.role}
          `,
          {
            userId: context.user.id,
          },
        )
        const group = result.records.map((record) => record.get('group'))
        return group
      })
      try {
        const group = await readTxResultPromise
        return group
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
            MERGE (owner)-[membership:MEMBER_OF]->(group)
            SET membership.createdAt = toString(datetime())
            SET membership.updatedAt = toString(datetime())
            SET membership.role = 'owner'
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
        return group
      } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    // UpdatePost: async (_parent, params, context, _resolveInfo) => {
    //   const { categoryIds } = params
    //   const { image: imageInput } = params
    //   delete params.categoryIds
    //   delete params.image
    //   const session = context.driver.session()
    //   let updatePostCypher = `
    //                             MATCH (post:Post {id: $params.id})
    //                             SET post += $params
    //                             SET post.updatedAt = toString(datetime())
    //                             WITH post
    //                           `

    //   if (categoryIds && categoryIds.length) {
    //     const cypherDeletePreviousRelations = `
    //       MATCH (post:Post { id: $params.id })-[previousRelations:CATEGORIZED]->(category:Category)
    //       DELETE previousRelations
    //       RETURN post, category
    //       `

    //     await session.writeTransaction((transaction) => {
    //       return transaction.run(cypherDeletePreviousRelations, { params })
    //     })

    //     updatePostCypher += `
    //       UNWIND $categoryIds AS categoryId
    //       MATCH (category:Category {id: categoryId})
    //       MERGE (post)-[:CATEGORIZED]->(category)
    //       WITH post
    //     `
    //   }

    //   updatePostCypher += `RETURN post {.*}`
    //   const updatePostVariables = { categoryIds, params }
    //   try {
    //     const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    //       const updatePostTransactionResponse = await transaction.run(
    //         updatePostCypher,
    //         updatePostVariables,
    //       )
    //       const [post] = updatePostTransactionResponse.records.map((record) => record.get('post'))
    //       await mergeImage(post, 'HERO_IMAGE', imageInput, { transaction })
    //       return post
    //     })
    //     const post = await writeTxResultPromise
    //     return post
    //   } finally {
    //     session.close()
    //   }
    // },

    // DeletePost: async (object, args, context, resolveInfo) => {
    //   const session = context.driver.session()
    //   const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    //     const deletePostTransactionResponse = await transaction.run(
    //       `
    //         MATCH (post:Post {id: $postId})
    //         OPTIONAL MATCH (post)<-[:COMMENTS]-(comment:Comment)
    //         SET post.deleted        = TRUE
    //         SET post.content        = 'UNAVAILABLE'
    //         SET post.contentExcerpt = 'UNAVAILABLE'
    //         SET post.title          = 'UNAVAILABLE'
    //         SET comment.deleted     = TRUE
    //         RETURN post {.*}
    //       `,
    //       { postId: args.id },
    //     )
    //     const [post] = deletePostTransactionResponse.records.map((record) => record.get('post'))
    //     await deleteImage(post, 'HERO_IMAGE', { transaction })
    //     return post
    //   })
    //   try {
    //     const post = await writeTxResultPromise
    //     return post
    //   } finally {
    //     session.close()
    //   }
  },
  Group: {
    ...Resolver('Group', {
      // Wolle: undefinedToNull: ['activityId', 'objectId', 'language', 'pinnedAt', 'pinned'],
      hasMany: {
        // Wolle: tags: '-[:TAGGED]->(related:Tag)',
        categories: '-[:CATEGORIZED]->(related:Category)',
      },
      // hasOne: {
      //   owner: '<-[:OWNS]-(related:User)',
      //   // Wolle: image: '-[:HERO_IMAGE]->(related:Image)',
      // },
      // Wolle: count: {
      //   contributionsCount:
      //     '-[:WROTE]->(related:Post) WHERE NOT related.disabled = true AND NOT related.deleted = true',
      // },
      // Wolle: boolean: {
      //   shoutedByCurrentUser:
      //     'MATCH(this)<-[:SHOUTED]-(related:User {id: $cypherParams.currentUserId}) RETURN COUNT(related) >= 1',
      //   viewedTeaserByCurrentUser:
      //     'MATCH (this)<-[:VIEWED_TEASER]-(u:User {id: $cypherParams.currentUserId}) RETURN COUNT(u) >= 1',
      // },
    }),
  },
}

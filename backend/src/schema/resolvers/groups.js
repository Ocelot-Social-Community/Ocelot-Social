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
  // Wolle: Query: {
  //   Post: async (object, params, context, resolveInfo) => {
  //     params = await filterForMutedUsers(params, context)
  //     params = await maintainPinnedPosts(params)
  //     return neo4jgraphql(object, params, context, resolveInfo)
  //   },
  //   findPosts: async (object, params, context, resolveInfo) => {
  //     params = await filterForMutedUsers(params, context)
  //     return neo4jgraphql(object, params, context, resolveInfo)
  //   },
  //   profilePagePosts: async (object, params, context, resolveInfo) => {
  //     params = await filterForMutedUsers(params, context)
  //     return neo4jgraphql(object, params, context, resolveInfo)
  //   },
  //   PostsEmotionsCountByEmotion: async (object, params, context, resolveInfo) => {
  //     const { postId, data } = params
  //     const session = context.driver.session()
  //     const readTxResultPromise = session.readTransaction(async (transaction) => {
  //       const emotionsCountTransactionResponse = await transaction.run(
  //         `
  //           MATCH (post:Post {id: $postId})<-[emoted:EMOTED {emotion: $data.emotion}]-()
  //           RETURN COUNT(DISTINCT emoted) as emotionsCount
  //         `,
  //         { postId, data },
  //       )
  //       return emotionsCountTransactionResponse.records.map(
  //         (record) => record.get('emotionsCount').low,
  //       )
  //     })
  //     try {
  //       const [emotionsCount] = await readTxResultPromise
  //       return emotionsCount
  //     } finally {
  //       session.close()
  //     }
  //   },
  //   PostsEmotionsByCurrentUser: async (object, params, context, resolveInfo) => {
  //     const { postId } = params
  //     const session = context.driver.session()
  //     const readTxResultPromise = session.readTransaction(async (transaction) => {
  //       const emotionsTransactionResponse = await transaction.run(
  //         `
  //           MATCH (user:User {id: $userId})-[emoted:EMOTED]->(post:Post {id: $postId})
  //           RETURN collect(emoted.emotion) as emotion
  //         `,
  //         { userId: context.user.id, postId },
  //       )
  //       return emotionsTransactionResponse.records.map((record) => record.get('emotion'))
  //     })
  //     try {
  //       const [emotions] = await readTxResultPromise
  //       return emotions
  //     } finally {
  //       session.close()
  //     }
  //   },
  // },
  Mutation: {
    CreateGroup: async (_parent, params, context, _resolveInfo) => {
      const { categoryIds } = params
      delete params.categoryIds
      params.id = params.id || uuid()
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const categoriesCypher =
          CONFIG.CATEGORIES_ACTIVE && categoryIds
            ? `WITH group
              UNWIND $categoryIds AS categoryId
              MATCH (category:Category {id: categoryId})
              MERGE (group)-[:CATEGORIZED]->(category)`
            : ''
        const ownercreateGroupTransactionResponse = await transaction.run(
          `
            CREATE (group:Group)
            SET group += $params
            SET group.createdAt = toString(datetime())
            SET group.updatedAt = toString(datetime())
            WITH group
            MATCH (owner:User {id: $userId})
            MERGE (group)<-[:OWNS]-(owner)
            MERGE (group)<-[:ADMINISTERS]-(owner)
            ${categoriesCypher}
            RETURN group {.*}
          `,
          { userId: context.user.id, categoryIds, params },
        )
        const [group] = ownercreateGroupTransactionResponse.records.map((record) =>
          record.get('group'),
        )
        return group
      })
      try {
        const group = await writeTxResultPromise
        return group
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Group with this slug already exists!')
        throw new Error(e)
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
      hasOne: {
        owner: '<-[:OWNS]-(related:User)',
        // Wolle: image: '-[:HERO_IMAGE]->(related:Image)',
      },
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

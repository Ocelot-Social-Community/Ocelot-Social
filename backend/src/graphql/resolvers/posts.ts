/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UserInputError } from 'apollo-server'
import { isEmpty } from 'lodash'
import { neo4jgraphql } from 'neo4j-graphql-js'
import { v4 as uuid } from 'uuid'

import { Context } from '@src/context'

import { validateEventParams } from './helpers/events'
import { filterForMutedUsers } from './helpers/filterForMutedUsers'
import { filterInvisiblePosts } from './helpers/filterInvisiblePosts'
import { filterPostsOfMyGroups } from './helpers/filterPostsOfMyGroups'
import Resolver from './helpers/Resolver'
import { images } from './images/images'
import { createOrUpdateLocations } from './users/location'

const maintainPinnedPosts = (params) => {
  const pinnedPostFilter = { pinned: true }
  if (isEmpty(params.filter)) {
    params.filter = { OR: [pinnedPostFilter, {}] }
  } else {
    params.filter = { OR: [pinnedPostFilter, { ...params.filter }] }
  }
  return params
}

const filterEventDates = (params) => {
  if (params.filter?.eventStart_gte) {
    const date = params.filter.eventStart_gte
    delete params.filter.eventStart_gte
    params.filter = { ...params.filter, OR: [{ eventStart_gte: date }, { eventEnd_gte: date }] }
  }
  return params
}

export default {
  Query: {
    Post: async (object, params, context: Context, resolveInfo) => {
      params = await filterPostsOfMyGroups(params, context)
      params = await filterInvisiblePosts(params, context)
      params = await filterForMutedUsers(params, context)
      params = filterEventDates(params)
      params = await maintainPinnedPosts(params)
      return neo4jgraphql(object, params, context, resolveInfo)
    },
    profilePagePosts: async (object, params, context, resolveInfo) => {
      params = await filterPostsOfMyGroups(params, context)
      params = await filterInvisiblePosts(params, context)
      params = await filterForMutedUsers(params, context)
      return neo4jgraphql(object, params, context, resolveInfo)
    },
    PostsEmotionsCountByEmotion: async (_object, params, context, _resolveInfo) => {
      const { postId, data } = params
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (transaction) => {
        const emotionsCountTransactionResponse = await transaction.run(
          `
            MATCH (post:Post {id: $postId})<-[emoted:EMOTED {emotion: $data.emotion}]-()
            RETURN COUNT(DISTINCT emoted) as emotionsCount
          `,
          { postId, data },
        )
        return emotionsCountTransactionResponse.records.map(
          (record) => record.get('emotionsCount').low,
        )
      })
      try {
        const [emotionsCount] = await readTxResultPromise
        return emotionsCount
      } finally {
        session.close()
      }
    },
    PostsEmotionsByCurrentUser: async (_object, params, context: Context, _resolveInfo) => {
      const { postId } = params
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (transaction) => {
        if (!context.user) {
          throw new Error('Missing authenticated user.')
        }
        const emotionsTransactionResponse = await transaction.run(
          `
            MATCH (user:User {id: $userId})-[emoted:EMOTED]->(post:Post {id: $postId})
            RETURN collect(emoted.emotion) as emotion
          `,
          { userId: context.user.id, postId },
        )
        return emotionsTransactionResponse.records.map((record) => record.get('emotion'))
      })
      try {
        const [emotions] = await readTxResultPromise
        return emotions
      } finally {
        await session.close()
      }
    },
    PostsPinnedCounts: async (_object, params, context: Context, _resolveInfo) => {
      const { config } = context
      const [postsPinnedCount] = (
        await context.database.query({
          query: 'MATCH (p:Post { pinned: true }) RETURN COUNT (p) AS count',
        })
      ).records.map((r) => Number(r.get('count').toString()))
      return {
        maxPinnedPosts: config.MAX_PINNED_POSTS,
        currentlyPinnedPosts: postsPinnedCount,
      }
    },
  },
  Mutation: {
    CreatePost: async (_parent, params, context: Context, _resolveInfo) => {
      const { user } = context
      if (!user) {
        throw new Error('Missing authenticated user.')
      }
      const { config } = context
      const { categoryIds, groupId } = params
      const { image: imageInput } = params

      const locationName = validateEventParams(params)

      delete params.categoryIds
      delete params.image
      delete params.groupId
      params.id = params.id || uuid()
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        let groupCypher = ''
        if (groupId) {
          groupCypher = `
            WITH post MATCH (group:Group { id: $groupId })
            MERGE (post)-[:IN]->(group)`
          const groupTypeResponse = await transaction.run(
            `
            MATCH (group:Group { id: $groupId }) RETURN group.groupType AS groupType`,
            { groupId },
          )
          const [groupType] = groupTypeResponse.records.map((record) => record.get('groupType'))
          if (groupType !== 'public')
            groupCypher += `
             WITH post, group
             MATCH (user:User)-[membership:MEMBER_OF]->(group)
               WHERE group.groupType IN ['closed', 'hidden']
                 AND membership.role IN ['usual', 'admin', 'owner']
             WITH post, collect(user.id) AS userIds
             OPTIONAL MATCH path =(restricted:User) WHERE NOT restricted.id IN userIds 
             FOREACH (user IN nodes(path) |
               MERGE (user)-[:CANNOT_SEE]->(post)
             )`
        }
        const categoriesCypher =
          config.CATEGORIES_ACTIVE && categoryIds && categoryIds.length > 0
            ? `WITH post
              UNWIND $categoryIds AS categoryId
              MATCH (category:Category {id: categoryId})
              MERGE (post)-[:CATEGORIZED]->(category)`
            : ''
        const createPostTransactionResponse = await transaction.run(
          `
            CREATE (post:Post)
            SET post += $params
            SET post.createdAt = toString(datetime())
            SET post.updatedAt = toString(datetime())
            SET post.sortDate = toString(datetime())
            SET post.clickedCount = 0
            SET post.viewedTeaserCount = 0
            SET post:${params.postType}
            WITH post
            MATCH (author:User {id: $userId})
            MERGE (post)<-[:WROTE]-(author)
            MERGE (post)<-[obs:OBSERVES]-(author)
            SET obs.active = true
            SET obs.createdAt = toString(datetime())
            SET obs.updatedAt = toString(datetime())
            ${categoriesCypher}
            ${groupCypher}
            RETURN post {.*, postType: [l IN labels(post) WHERE NOT l = 'Post'] }
          `,
          { userId: user.id, categoryIds, groupId, params },
        )
        const [post] = createPostTransactionResponse.records.map((record) => record.get('post'))
        if (imageInput) {
          await images(context.config).mergeImage(post, 'HERO_IMAGE', imageInput, { transaction })
        }
        return post
      })
      try {
        const post = await writeTxResultPromise
        if (locationName) {
          await createOrUpdateLocations('Post', post.id, locationName, session, context)
        }
        return post
      } catch (e) {
        if (e.code === 'Neo.ClientError.Schema.ConstraintValidationFailed')
          throw new UserInputError('Post with this slug already exists!')
        throw new Error(e)
      } finally {
        await session.close()
      }
    },
    UpdatePost: async (_parent, params, context: Context, _resolveInfo) => {
      const { config } = context
      const { categoryIds } = params
      const { image: imageInput } = params

      const locationName = validateEventParams(params)

      delete params.categoryIds
      delete params.image
      const session = context.driver.session()
      let updatePostCypher = `
        MATCH (post:Post {id: $params.id})
        SET post += $params
        SET post.updatedAt = toString(datetime())
        WITH post
      `

      if (config.CATEGORIES_ACTIVE && categoryIds && categoryIds.length) {
        const cypherDeletePreviousRelations = `
          MATCH (post:Post { id: $params.id })-[previousRelations:CATEGORIZED]->(category:Category)
          DELETE previousRelations
          RETURN post, category
          `

        await session.writeTransaction((transaction) => {
          return transaction.run(cypherDeletePreviousRelations, { params })
        })

        updatePostCypher += `
          UNWIND $categoryIds AS categoryId
          MATCH (category:Category {id: categoryId})
          MERGE (post)-[:CATEGORIZED]->(category)
          WITH post
        `
      }

      if (params.postType) {
        updatePostCypher += `
          REMOVE post:Article
          REMOVE post:Event
          SET post:${params.postType}
          WITH post
        `
      }

      updatePostCypher += `RETURN post {.*, postType: [l IN labels(post) WHERE NOT l = 'Post']}`
      const updatePostVariables = { categoryIds, params }
      try {
        const writeTxResultPromise = session.writeTransaction(async (transaction) => {
          const updatePostTransactionResponse = await transaction.run(
            updatePostCypher,
            updatePostVariables,
          )
          const [post] = updatePostTransactionResponse.records.map((record) => record.get('post'))
          await images(context.config).mergeImage(post, 'HERO_IMAGE', imageInput, { transaction })
          return post
        })
        const post = await writeTxResultPromise
        if (locationName) {
          await createOrUpdateLocations('Post', post.id, locationName, session, context)
        }
        return post
      } finally {
        await session.close()
      }
    },

    DeletePost: async (_object, args, context: Context, _resolveInfo) => {
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const deletePostTransactionResponse = await transaction.run(
          `
            MATCH (post:Post {id: $postId})
            OPTIONAL MATCH (post)<-[:COMMENTS]-(comment:Comment)
            SET post.deleted        = TRUE
            SET post.content        = 'UNAVAILABLE'
            SET post.contentExcerpt = 'UNAVAILABLE'
            SET post.title          = 'UNAVAILABLE'
            SET comment.deleted     = TRUE
            RETURN post {.*}
          `,
          { postId: args.id },
        )
        const [post] = deletePostTransactionResponse.records.map((record) => record.get('post'))
        await images(context.config).deleteImage(post, 'HERO_IMAGE', { transaction })
        return post
      })
      try {
        const post = await writeTxResultPromise
        return post
      } finally {
        await session.close()
      }
    },
    AddPostEmotions: async (_object, params, context: Context, _resolveInfo) => {
      const { to, data } = params
      const { user } = context
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const addPostEmotionsTransactionResponse = await transaction.run(
          `
          MATCH (userFrom:User {id: $user.id}), (postTo:Post {id: $to.id})
          MERGE (userFrom)-[emotedRelation:EMOTED {emotion: $data.emotion}]->(postTo)
          RETURN userFrom, postTo, emotedRelation`,
          { user, to, data },
        )
        return addPostEmotionsTransactionResponse.records.map((record) => {
          return {
            from: { ...record.get('userFrom').properties },
            to: { ...record.get('postTo').properties },
            ...record.get('emotedRelation').properties,
          }
        })
      })
      try {
        const [emoted] = await writeTxResultPromise
        return emoted
      } finally {
        await session.close()
      }
    },
    RemovePostEmotions: async (_object, params, context, _resolveInfo) => {
      const { to, data } = params
      const { id: from } = context.user
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const removePostEmotionsTransactionResponse = await transaction.run(
          `
            MATCH (userFrom:User {id: $from})-[emotedRelation:EMOTED {emotion: $data.emotion}]->(postTo:Post {id: $to.id})
            DELETE emotedRelation
            RETURN userFrom, postTo
          `,
          { from, to, data },
        )
        return removePostEmotionsTransactionResponse.records.map((record) => {
          return {
            from: { ...record.get('userFrom').properties },
            to: { ...record.get('postTo').properties },
            emotion: data.emotion,
          }
        })
      })
      try {
        const [emoted] = await writeTxResultPromise
        return emoted
      } finally {
        session.close()
      }
    },
    pinPost: async (_parent, params, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      const { config } = context
      if (config.MAX_PINNED_POSTS === 0) throw new Error('Pinned posts are not allowed!')
      let pinnedPostWithNestedAttributes
      const { driver, user } = context
      const session = driver.session()
      const { id: userId } = user
      const pinPostCypher = `
        MATCH (user:User {id: $userId}) WHERE user.role = 'admin'
        MATCH (post:Post {id: $params.id})
        WHERE NOT EXISTS((post)-[:IN]->(:Group)) OR 
          (post)-[:IN]->(:Group { groupType: 'public'})
        MERGE (user)-[pinned:PINNED {createdAt: toString(datetime())}]->(post)
        SET post.pinned = true
        RETURN post, pinned.createdAt as pinnedAt`

      if (config.MAX_PINNED_POSTS === 1) {
        let writeTxResultPromise = session.writeTransaction(async (transaction) => {
          const deletePreviousRelationsResponse = await transaction.run(
            `
          MATCH (:User)-[previousRelations:PINNED]->(post:Post)
          REMOVE post.pinned
          DELETE previousRelations
          RETURN post
        `,
          )
          return deletePreviousRelationsResponse.records.map(
            (record) => record.get('post').properties,
          )
        })
        try {
          await writeTxResultPromise

          writeTxResultPromise = session.writeTransaction(async (transaction) => {
            const pinPostTransactionResponse = await transaction.run(pinPostCypher, {
              userId,
              params,
            })
            return pinPostTransactionResponse.records.map((record) => ({
              pinnedPost: record.get('post').properties,
              pinnedAt: record.get('pinnedAt'),
            }))
          })
          const [transactionResult] = await writeTxResultPromise
          if (transactionResult) {
            const { pinnedPost, pinnedAt } = transactionResult
            pinnedPostWithNestedAttributes = {
              ...pinnedPost,
              pinnedAt,
            }
          }
        } finally {
          await session.close()
        }
        return pinnedPostWithNestedAttributes
      } else {
        const [currentPinnedPostCount] = (
          await context.database.query({
            query: `MATCH (:User)-[:PINNED]->(post:Post { pinned: true }) RETURN COUNT(post) AS count`,
          })
        ).records.map((r) => Number(r.get('count').toString()))
        if (currentPinnedPostCount >= config.MAX_PINNED_POSTS) {
          throw new Error('Max number of pinned posts is reached!')
        }
        const [pinPostResult] = (
          await context.database.write({
            query: pinPostCypher,
            variables: { userId, params },
          })
        ).records.map((r) => ({
          ...r.get('post').properties,
          pinnedAt: r.get('pinnedAt'),
        }))
        return pinPostResult
      }
    },
    unpinPost: async (_parent, params, context, _resolveInfo) => {
      let unpinnedPost
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const unpinPostTransactionResponse = await transaction.run(
          `
          MATCH (:User)-[previousRelations:PINNED]->(post:Post {id: $params.id})
          REMOVE post.pinned
          DELETE previousRelations
          RETURN post
        `,
          { params },
        )
        return unpinPostTransactionResponse.records.map((record) => record.get('post').properties)
      })
      try {
        ;[unpinnedPost] = await writeTxResultPromise
      } finally {
        session.close()
      }
      return unpinnedPost
    },
    pinGroupPost: async (_parent, params, context: Context, _resolveInfo) => {
      if (!context.user) {
        throw new Error('Missing authenticated user.')
      }
      const { config } = context

      if (config.MAX_PINNED_POSTS === 0) {
        throw new Error('Pinned posts are not allowed!')
      }

      // If MAX_PINNED_POSTS === 1 -> Delete old pin
      if (config.MAX_PINNED_POSTS === 1) {
        await context.database.write({
          query: `
          MATCH (post:Post {id: $postId})-[:IN]->(group:Group)
          MATCH (:User)-[pinned:GROUP_PINNED]->(:Post)-[:IN]->(:Group {id: group.id})
          DELETE pinned
          RETURN post`,
          variables: { user: context.user, postId: params.id },
        })
        // If MAX_PINNED_POSTS !== 1 -> Check if max is reached
      } else {
        const result = await context.database.query({
          query: `
          MATCH (post:Post {id: $params.id})-[:IN]->(group:Group)
          MATCH (:User)-[pinned:GROUP_PINNED]->(pinnedPosts:Post)-[:IN]->(:Group {id: group.id})
          RETURN count(pinnedPosts) as count`,
          variables: { user: context.user },
        })
        if (result.records[0].get('count') >= config.MAX_PINNED_POSTS) {
          throw new Error('Reached maxed pinned posts already. Unpin a post first-')
        }
      }

      // Set new pin
      const result = await context.database.write({
        query: `
          MATCH (user:User {id: $user.id})
          MATCH (post:Post {id: $params.id})-[:IN]->(group:Group)
          MERGE (user)-[pinned:GROUP_PINNED{createdAt: toString(datetime())}]->(post)
          RETURN post, pinned.createdAt as pinnedAt`,
        variables: { user: context.user },
      })

      // Return post
      return result.records[0].get('post')
    },
    unpinGroupPost: async (_parent, params, context, _resolveInfo) => {
      const result = await context.database.write({
        query: `
          MATCH [pinned:GROUP_PINNED]->(post:Post {id: $postId})
          DELETE pinned
          RETURN post`,
        variables: { postId: params.id },
      })

      // Return post
      return result.records[0].get('post')
    },
    markTeaserAsViewed: async (_parent, params, context, _resolveInfo) => {
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const transactionResponse = await transaction.run(
          `
          MATCH (post:Post { id: $params.id })
          MATCH (user:User { id: $userId })
          MERGE (user)-[relation:VIEWED_TEASER { }]->(post)
          ON CREATE
          SET relation.createdAt = toString(datetime()),
          post.viewedTeaserCount = post.viewedTeaserCount + 1
          RETURN post
        `,
          { userId: context.user.id, params },
        )
        return transactionResponse.records.map((record) => record.get('post').properties)
      })
      try {
        const [post] = await writeTxResultPromise
        post.viewedTeaserCount = post.viewedTeaserCount.low
        return post
      } finally {
        session.close()
      }
    },
    toggleObservePost: async (_parent, params, context, _resolveInfo) => {
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const transactionResponse = await transaction.run(
          `
          MATCH (post:Post { id: $params.id })
          MATCH (user:User { id: $userId })
          MERGE (user)-[obs:OBSERVES]->(post)
          ON CREATE SET 
            obs.createdAt = toString(datetime()),
            obs.updatedAt = toString(datetime()),
            obs.active = $params.value
          ON MATCH SET
            obs.updatedAt = toString(datetime()),
            obs.active = $params.value
          RETURN post
        `,
          { userId: context.user.id, params },
        )
        return transactionResponse.records.map((record) => record.get('post').properties)
      })
      try {
        const [post] = await writeTxResultPromise
        post.viewedTeaserCount = post.viewedTeaserCount.low
        return post
      } finally {
        session.close()
      }
    },
    pushPost: async (_parent, params, context: Context, _resolveInfo) => {
      const posts = (
        await context.database.write({
          query: `
        MATCH (post:Post {id: $id})
        SET post.sortDate = toString(datetime())
        RETURN post {.*}`,
          variables: params,
        })
      ).records.map((record) => record.get('post'))

      if (posts.length !== 1) {
        throw new Error('Could not find Post')
      }

      return posts[0]
    },
    unpushPost: async (_parent, params, context: Context, _resolveInfo) => {
      const posts = (
        await context.database.write({
          query: `
        MATCH (post:Post {id: $id})
        SET post.sortDate = post.createdAt
        RETURN post {.*}`,
          variables: params,
        })
      ).records.map((record) => record.get('post'))

      if (posts.length !== 1) {
        throw new Error('Could not find Post')
      }

      return posts[0]
    },
  },
  Post: {
    ...Resolver('Post', {
      undefinedToNull: [
        'activityId',
        'objectId',
        'language',
        'pinnedAt',
        'pinned',
        'eventVenue',
        'eventLocation',
        'eventLocationName',
        'eventStart',
        'eventEnd',
        'eventIsOnline',
      ],
      hasMany: {
        tags: '-[:TAGGED]->(related:Tag)',
        categories: '-[:CATEGORIZED]->(related:Category)',
        comments: '<-[:COMMENTS]-(related:Comment)',
        shoutedBy: '<-[:SHOUTED]-(related:User)',
        emotions: '<-[related:EMOTED]',
      },
      hasOne: {
        author: '<-[:WROTE]-(related:User)',
        pinnedBy: '<-[:PINNED]-(related:User)',
        image: '-[:HERO_IMAGE]->(related:Image)',
        group: '-[:IN]->(related:Group)',
        eventLocation: '-[:IS_IN]->(related:Location)',
      },
      count: {
        commentsCount:
          '<-[:COMMENTS]-(related:Comment) WHERE NOT related.deleted = true AND NOT related.disabled = true',
        shoutedCount:
          '<-[:SHOUTED]-(related:User) WHERE NOT related.deleted = true AND NOT related.disabled = true',
        emotionsCount: '<-[related:EMOTED]-(:User)',
        observingUsersCount:
          '<-[obs:OBSERVES]-(related:User) WHERE obs.active = true AND NOT related.deleted = true AND NOT related.disabled = true',
      },
      boolean: {
        shoutedByCurrentUser:
          'MATCH(this)<-[:SHOUTED]-(related:User {id: $cypherParams.currentUserId}) RETURN COUNT(related) >= 1',
        viewedTeaserByCurrentUser:
          'MATCH (this)<-[:VIEWED_TEASER]-(u:User {id: $cypherParams.currentUserId}) RETURN COUNT(u) >= 1',
        isObservedByMe:
          'MATCH (this)<-[obs:OBSERVES]-(related:User {id: $cypherParams.currentUserId}) WHERE obs.active = true RETURN COUNT(related) >= 1',
      },
    }),
    relatedContributions: async (parent, _params, context, _resolveInfo) => {
      if (typeof parent.relatedContributions !== 'undefined') return parent.relatedContributions
      const { id } = parent
      const session = context.driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const relatedContributionsTransactionResponse = await transaction.run(
          `
            MATCH (p:Post {id: $id})-[:TAGGED|CATEGORIZED]->(categoryOrTag)<-[:TAGGED|CATEGORIZED]-(post:Post)
            WHERE NOT post.deleted AND NOT post.disabled
            RETURN DISTINCT post
            LIMIT 10
          `,
          { id },
        )
        return relatedContributionsTransactionResponse.records.map(
          (record) => record.get('post').properties,
        )
      })
      try {
        const relatedContributions = await writeTxResultPromise
        return relatedContributions
      } finally {
        session.close()
      }
    },
  },
}

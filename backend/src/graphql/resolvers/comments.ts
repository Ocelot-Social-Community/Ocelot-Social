/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { v4 as uuid } from 'uuid'

import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'

import { nodeQuery } from './helpers/nodeQuery'
import Resolver from './helpers/Resolver'

import type { NodeQueryParams } from './helpers/nodeQuery'
import type { Context } from '@src/context'
import type { Transaction } from 'neo4j-driver'

/** A block either way between the user bound as `user` and the author of the post bound as `post`. */
const BLOCKED_WITH_POST_AUTHOR = (user: string, post: string): string =>
  `EXISTS { MATCH (${user})-[:BLOCKED]-(:User)-[:WROTE]->(${post}) }`

// The write matched nothing. A block is the reason worth naming; anything else (a post or
// comment that is gone) keeps its old answer, an empty result.
const refuseIfBlocked = async (untypedTransaction: unknown, userId: string, postId: string) => {
  // `unknown`: the callers' transactions come from an untyped driver session.
  const transaction = untypedTransaction as Transaction
  const result = await transaction.run(
    `MATCH (user:User { id: $userId }), (post:Post { id: $postId })
     WHERE ${BLOCKED_WITH_POST_AUTHOR('user', 'post')}
     RETURN post.id`,
    { userId, postId },
  )
  if (result.records.length > 0) {
    throw new AppError(Errors.COMMENT_SAVE_BLOCKED)
  }
}

const refuseIfBlockedUnder = async (untypedTransaction: unknown, commentId: string) => {
  const transaction = untypedTransaction as Transaction
  const result = await transaction.run(
    `MATCH (commenter:User)-[:WROTE]->(:Comment { id: $commentId })-[:COMMENTS]->(post:Post)
     WHERE ${BLOCKED_WITH_POST_AUTHOR('commenter', 'post')}
     RETURN post.id`,
    { commentId },
  )
  if (result.records.length > 0) {
    throw new AppError(Errors.COMMENT_SAVE_BLOCKED)
  }
}

// The Comment root query, hand-written since the neo4j-graphql-js migration.
// softDeleteMiddleware injects `deleted`/`disabled` as top-level arguments, so those must
// constrain the query — without them, deleted comments are served to everyone.
const commentQuery = nodeQuery({
  label: 'Comment',
  equalityFields: ['id', 'content', 'createdAt', 'updatedAt'],
  softDeleteFields: ['deleted', 'disabled'],
  orderingEnum: '_CommentOrdering',
  // Oldest first: a comment list reads as a thread.
  defaultOrder: { field: 'createdAt', direction: 'ASC' as const },
})

export default {
  Query: {
    Comment: async (_object, params: NodeQueryParams, context: Context, _resolveInfo) =>
      commentQuery(params, context),
  },
  Mutation: {
    CreateComment: async (_object, params, context, _resolveInfo) => {
      const { postId } = params
      const { user, driver } = context
      // Adding relationship from comment to post by passing in the postId,
      // but we do not want to create the comment with postId as an attribute
      // because we use relationships for this. So, we are deleting it from params
      // before comment creation.
      delete params.postId
      params.id = params.id || uuid()

      const session = driver.session()

      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createCommentTransactionResponse = await transaction.run(
          ` 
            MATCH (post:Post {id: $postId})
            MATCH (author:User {id: $userId})
            // Refused here, where the comment is written, not only in the webapp's form: a block
            // either way between the commenter and the post's author ends commenting (#10744).
            WHERE NOT ${BLOCKED_WITH_POST_AUTHOR('author', 'post')}
            WITH post, author
            CREATE (comment:Comment $params)
            SET comment.createdAt = toString(datetime())
            SET comment.updatedAt = toString(datetime())
            SET comment.createdByApiKey = $apiKeyId
            MERGE (post)<-[:COMMENTS]-(comment)<-[:WROTE]-(author)
            WITH post, author, comment
            MERGE (post)<-[obs:OBSERVES]-(author)
            ON CREATE SET
              obs.active = true,
              obs.createdAt = toString(datetime()),
              obs.updatedAt = toString(datetime())      
            RETURN comment
          `,
          { userId: user.id, postId, params, apiKeyId: user.apiKeyId || null },
        )
        const created = createCommentTransactionResponse.records.map(
          (record) => record.get('comment').properties,
        )
        if (created.length === 0) {
          await refuseIfBlocked(transaction, user.id as string, postId as string)
        }
        return created
      })
      try {
        const [comment] = await writeTxResultPromise
        return comment
      } finally {
        await session.close()
      }
    },
    UpdateComment: async (_parent, params, context, _resolveInfo) => {
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const updateCommentTransactionResponse = await transaction.run(
          `
            MATCH (comment:Comment {id: $params.id})
            // An old comment is no way around the block: editing it is commenting again. Deleting
            // it stays — one's own content one may always take away.
            WHERE NOT EXISTS {
              MATCH (commenter:User)-[:WROTE]->(comment)-[:COMMENTS]->(post:Post)
              WHERE ${BLOCKED_WITH_POST_AUTHOR('commenter', 'post')}
            }
            SET comment += $params
            SET comment.updatedAt = toString(datetime())
            RETURN comment
          `,
          { params },
        )
        const updated = updateCommentTransactionResponse.records.map(
          (record) => record.get('comment').properties,
        )
        if (updated.length === 0) {
          await refuseIfBlockedUnder(transaction, params.id as string)
        }
        return updated
      })
      try {
        const [comment] = await writeTxResultPromise
        return comment
      } finally {
        await session.close()
      }
    },
    DeleteComment: async (_parent, args, context, _resolveInfo) => {
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const deleteCommentTransactionResponse = await transaction.run(
          ` 
            MATCH (comment:Comment {id: $commentId})
            SET comment.deleted        = TRUE
            SET comment.content        = 'UNAVAILABLE'
            RETURN comment
          `,
          { commentId: args.id },
        )
        return deleteCommentTransactionResponse.records.map(
          (record) => record.get('comment').properties,
        )
      })
      try {
        const [comment] = await writeTxResultPromise
        return comment
      } finally {
        await session.close()
      }
    },
  },
  Comment: {
    ...Resolver('Comment', {
      hasOne: {
        author: '<-[:WROTE]-(related:User)',
        post: '-[:COMMENTS]->(related:Post)',
      },
      count: {
        postObservingUsersCount:
          '-[:COMMENTS]->(:Post)<-[obs:OBSERVES]-(related:User) WHERE obs.active = true AND NOT related.deleted AND NOT related.disabled',
        shoutedCount:
          '<-[:SHOUTED]-(related:User) WHERE NOT related.deleted = true AND NOT related.disabled = true',
      },
      boolean: {
        isPostObservedByMe:
          'MATCH (this)-[:COMMENTS]->(:Post)<-[obs:OBSERVES]-(related:User {id: $cypherParams.currentUserId}) WHERE obs.active = true RETURN COUNT(related) >= 1',
        shoutedByCurrentUser:
          'MATCH (this) RETURN EXISTS((this)<-[:SHOUTED]-(:User {id: $cypherParams.currentUserId}))',
      },
    }),
  },
}

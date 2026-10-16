/* eslint-disable @typescript-eslint/require-await */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'
import { branding } from '@src/branding'

import type { IMiddlewareResolver } from 'graphql-middleware/types'

const COMMENT_MIN_LENGTH = 1
const validateCreateComment: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  const content = args.content.replace(/<(?:.|\n)*?>/gm, '').trim()
  const { postId } = args

  if (!args.content || content.length < COMMENT_MIN_LENGTH) {
    throw new AppError(Errors.COMMENT_SAVE_CONTENT_TOO_SHORT, { min: COMMENT_MIN_LENGTH })
  }
  const session = context.driver.session()
  try {
    const postQueryRes = await session.readTransaction((transaction) => {
      return transaction.run(
        `
          MATCH (post:Post {id: $postId})
          RETURN post
        `,
        { postId },
      )
    })
    const [post] = postQueryRes.records.map((record) => {
      return record.get('post')
    })

    if (!post) {
      throw new AppError(Errors.POST_DOES_NOT_EXIST)
    } else {
      return resolve(root, args, context, info)
    }
  } finally {
    await session.close()
  }
}

const validateUpdateComment: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  const content = args.content.replace(/<(?:.|\n)*?>/gm, '').trim()
  if (!args.content || content.length < COMMENT_MIN_LENGTH) {
    throw new AppError(Errors.COMMENT_SAVE_CONTENT_TOO_SHORT, { min: COMMENT_MIN_LENGTH })
  }

  return resolve(root, args, context, info)
}

const validateReport: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  const { resourceId } = args
  const { user, driver } = context
  if (resourceId === user.id) {
    throw new AppError(Errors.REPORT_TARGET_IS_OWN)
  }
  // Nor their own posts and comments. The webapp hides "Report" on them, the API refuses them too.
  const session = driver.session()
  try {
    const result = await session.readTransaction((transaction) =>
      transaction.run(
        `
          OPTIONAL MATCH (:User {id: $userId})-[:WROTE]->(resource {id: $resourceId})
          WHERE resource:Post OR resource:Comment
          RETURN resource IS NOT NULL AS isOwn
        `,
        { userId: user.id, resourceId },
      ),
    )
    if (result.records[0]?.get('isOwn')) {
      throw new AppError(Errors.REPORT_TARGET_IS_OWN)
    }
  } finally {
    await session.close()
  }
  return resolve(root, args, context, info)
}

const validateReview: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  const { resourceId } = args
  let existingReportedResource
  const { user, driver } = context
  if (resourceId === user.id) {
    throw new AppError(Errors.REVIEW_TARGET_IS_OWN)
  }
  const session = driver.session()
  try {
    const txResult = await session.readTransaction(async (transaction) => {
      const validateReviewTransactionResponse = await transaction.run(
        `
          MATCH (resource {id: $resourceId})
          WHERE resource:User OR resource:Post OR resource:Comment
          OPTIONAL MATCH (:User)-[filed:FILED]->(:Report {closed: false})-[:BELONGS_TO]->(resource)
          OPTIONAL MATCH (resource)<-[:WROTE]-(author:User)
          RETURN [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'User']][0] AS label, author, filed
        `,
        {
          resourceId,
          submitterId: user.id,
        },
      )
      return validateReviewTransactionResponse.records.map((record) => ({
        label: record.get('label'),
        author: record.get('author'),
        filed: record.get('filed'),
      }))
    })
    existingReportedResource = txResult
    if (!existingReportedResource?.length) {
      throw new AppError(Errors.REVIEW_TARGET_DOES_NOT_EXIST)
    }
    existingReportedResource = existingReportedResource[0]
    if (!existingReportedResource.filed) {
      throw new AppError(Errors.REVIEW_TARGET_NOT_REPORTED, {
        label: existingReportedResource.label,
      })
    }
    const authorId =
      existingReportedResource.label !== 'User' && existingReportedResource.author
        ? existingReportedResource.author.properties.id
        : null
    if (authorId && authorId === user.id) {
      throw new AppError(Errors.REVIEW_TARGET_IS_OWN)
    }
  } finally {
    await session.close()
  }

  return resolve(root, args, context, info)
}

export const validateNotifyUsers = async (label: string, reason: string): Promise<void> => {
  const reasonsAllowed = [
    'mentioned_in_post',
    'mentioned_in_comment',
    'commented_on_post',
    'followed_user_posted',
    'post_in_group',
  ]
  if (!reasonsAllowed.includes(reason)) {
    throw new Error('Notification reason is not allowed!')
  }
  if (
    (label === 'Post' && reason !== 'mentioned_in_post') ||
    (label === 'Comment' && !['mentioned_in_comment', 'commented_on_post'].includes(reason))
  ) {
    throw new Error('Notification does not fit the reason!')
  }
}

// The name and slug rules are the brand's (branding.user), the same values the webapp checks
// against, so a client that skips the form cannot store what the form would refuse.
const validateUserName = (name: unknown): void => {
  if (typeof name !== 'string') {
    return
  }
  const { nameLengthMin: min, nameLengthMax: max } = branding.user
  const { length } = name.trim()
  if (length < min) {
    throw new AppError(Errors.USER_PROFILE_NAME_TOO_SHORT, { min })
  }
  if (length > max) {
    throw new AppError(Errors.USER_PROFILE_NAME_TOO_LONG, { max })
  }
}

const validateUserSlug = (slug: unknown): void => {
  if (typeof slug !== 'string') {
    return
  }
  const { slugLengthMin: min, slugLengthMax: max } = branding.user
  if (slug.length < min) {
    throw new AppError(Errors.USER_PROFILE_SLUG_TOO_SHORT, { min })
  }
  if (slug.length > max) {
    throw new AppError(Errors.USER_PROFILE_SLUG_TOO_LONG, { max })
  }
}

const validateSignupVerification: IMiddlewareResolver = async (
  resolve,
  root,
  args,
  context,
  info,
) => {
  validateUserName(args.name)
  // Only a slug the client chose. Without one, sluggifyMiddleware derives it from the name and
  // keeps it inside the same bounds.
  validateUserSlug(args.slug)
  return resolve(root, args, context, info)
}

const validateUpdateUser: IMiddlewareResolver = async (resolve, root, params, context, info) => {
  const { id, name, slug } = params
  validateUserName(name)
  if (typeof slug === 'string') {
    // Only a slug that changes. The settings form sends the slug on every save, and an account
    // whose slug predates the bounds (or a brand that tightened them) must still be able to save
    // the rest of its profile without being made to rename itself.
    const session = context.driver.session()
    try {
      const result = await session.readTransaction((transaction) =>
        transaction.run('MATCH (user:User {id: $id}) RETURN user.slug AS slug', { id }),
      )
      if (result.records[0]?.get('slug') !== slug) {
        validateUserSlug(slug)
      }
    } finally {
      await session.close()
    }
  }
  return resolve(root, params, context, info)
}

export default {
  Mutation: {
    CreateComment: validateCreateComment,
    UpdateComment: validateUpdateComment,
    SignupVerification: validateSignupVerification,
    UpdateUser: validateUpdateUser,
    fileReport: validateReport,
    review: validateReview,
  },
}

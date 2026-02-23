/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import trunc from 'trunc-html'

import { DESCRIPTION_EXCERPT_HTML_LENGTH } from '@constants/groups'

import type { IMiddlewareResolver } from 'graphql-middleware/dist/types'

const createGroup: IMiddlewareResolver = (resolve, root, args, context, info) => {
  args.descriptionExcerpt = trunc(args.description, DESCRIPTION_EXCERPT_HTML_LENGTH).html
  return resolve(root, args, context, info)
}

const updateGroup: IMiddlewareResolver = (resolve, root, args, context, info) => {
  if (args.description)
    args.descriptionExcerpt = trunc(args.description, DESCRIPTION_EXCERPT_HTML_LENGTH).html
  return resolve(root, args, context, info)
}

const createPost: IMiddlewareResolver = (resolve, root, args, context, info) => {
  args.contentExcerpt = trunc(args.content, 120).html
  return resolve(root, args, context, info)
}

const updatePost: IMiddlewareResolver = (resolve, root, args, context, info) => {
  args.contentExcerpt = trunc(args.content, 120).html
  return resolve(root, args, context, info)
}

const createComment: IMiddlewareResolver = (resolve, root, args, context, info) => {
  args.contentExcerpt = trunc(args.content, 180).html
  return resolve(root, args, context, info)
}

const updateComment: IMiddlewareResolver = (resolve, root, args, context, info) => {
  args.contentExcerpt = trunc(args.content, 180).html
  return resolve(root, args, context, info)
}

export default {
  Mutation: {
    CreateGroup: createGroup,
    UpdateGroup: updateGroup,
    CreatePost: createPost,
    UpdatePost: updatePost,
    CreateComment: createComment,
    UpdateComment: updateComment,
  },
}

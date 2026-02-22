/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { IMiddlewareResolver } from 'graphql-middleware/dist/types'

const isModerator = ({ user }) => {
  return user && (user.role === 'moderator' || user.role === 'admin')
}

const setDefaultFilters: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  args.deleted = false

  if (!isModerator(context)) {
    args.disabled = false
  }
  return resolve(root, args, context, info)
}

const obfuscate: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  if (root.deleted || (!isModerator(context) && root.disabled)) {
    root.content = 'UNAVAILABLE'
    root.contentExcerpt = 'UNAVAILABLE'
    root.title = 'UNAVAILABLE'
    root.slug = 'UNAVAILABLE'
    root.avatar = null
    root.about = 'UNAVAILABLE'
    root.name = 'UNAVAILABLE'
    root.image = null
  }
  return resolve(root, args, context, info)
}

const mutationDefaults: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  args.disabled = false
  // TODO: remove as soon as our factories don't need this anymore
  if (typeof args.deleted !== 'boolean') {
    args.deleted = false
  }
  return resolve(root, args, context, info)
}

export default {
  Query: {
    Post: setDefaultFilters,
    Comment: setDefaultFilters,
    User: setDefaultFilters,
    profilePagePosts: setDefaultFilters,
  },
  Mutation: mutationDefaults,
  Post: obfuscate,
  User: obfuscate,
  Comment: obfuscate,
}

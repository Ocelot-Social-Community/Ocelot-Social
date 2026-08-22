/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import uniqueSlug from './slugify/uniqueSlug'

import type { Context } from '@src/context'

// excludeId lets an update exclude the very node being updated from the
// uniqueness check — without it, re-saving a post/group/user without an
// explicit slug always collides with its own existing slug and picks up an
// unwanted "-1" (or increments further on every subsequent save).
export const isUniqueFor = (context: Context, type: string, excludeId?: string) => {
  return async (slug: string) => {
    const session = context.driver.session()
    try {
      const existingSlug = await session.readTransaction((transaction) => {
        return transaction.run(
          `
            MATCH(p:${type} {slug: $slug })
            ${excludeId ? 'WHERE p.id <> $excludeId' : ''}
            RETURN p.slug
          `,
          { slug, excludeId },
        )
      })
      return existingSlug.records.length === 0
    } finally {
      await session.close()
    }
  }
}

export default {
  Mutation: {
    SignupVerification: async (
      resolve,
      root,
      args: { slug: string; name: string },
      context: Context,
      info,
    ) => {
      args.slug = args.slug || (await uniqueSlug(args.name, isUniqueFor(context, 'User')))
      return resolve(root, args, context, info)
    },
    CreateGroup: async (
      resolve,
      root,
      args: { slug: string; name: string },
      context: Context,
      info,
    ) => {
      args.slug = args.slug || (await uniqueSlug(args.name, isUniqueFor(context, 'Group')))
      return resolve(root, args, context, info)
    },
    CreatePost: async (
      resolve,
      root,
      args: { slug: string; title: string },
      context: Context,
      info,
    ) => {
      args.slug = args.slug || (await uniqueSlug(args.title, isUniqueFor(context, 'Post')))
      return resolve(root, args, context, info)
    },
    UpdatePost: async (
      resolve,
      root,
      args: { slug: string; title: string; id: string },
      context: Context,
      info,
    ) => {
      // TODO: is this absolutely correct? what happens if "args.title" is not defined? may it works accidentally, because "args.title" or "args.slug" is always send?
      // excludeId: without it, re-saving a post without an explicit slug
      // always collides with its own current slug and picks up an unwanted
      // "-1" suffix (or increments further on every subsequent save).
      args.slug = args.slug || (await uniqueSlug(args.title, isUniqueFor(context, 'Post', args.id)))
      return resolve(root, args, context, info)
    },
  },
}

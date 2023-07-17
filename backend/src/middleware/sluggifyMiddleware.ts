import uniqueSlug from './slugify/uniqueSlug'

const isUniqueFor = (context, type) => {
  return async (slug) => {
    const session = context.driver.session()
    try {
      const existingSlug = await session.readTransaction((transaction) => {
        return transaction.run(
          `
            MATCH(p:${type} {slug: $slug }) 
            RETURN p.slug
          `,
          { slug },
        )
      })
      return existingSlug.records.length === 0
    } finally {
      session.close()
    }
  }
}

export default {
  Mutation: {
    SignupVerification: async (resolve, root, args, context, info) => {
      args.slug = args.slug || (await uniqueSlug(args.name, isUniqueFor(context, 'User')))
      return resolve(root, args, context, info)
    },
    CreateGroup: async (resolve, root, args, context, info) => {
      args.slug = args.slug || (await uniqueSlug(args.name, isUniqueFor(context, 'Group')))
      return resolve(root, args, context, info)
    },
    CreatePost: async (resolve, root, args, context, info) => {
      args.slug = args.slug || (await uniqueSlug(args.title, isUniqueFor(context, 'Post')))
      return resolve(root, args, context, info)
    },
    UpdatePost: async (resolve, root, args, context, info) => {
      // TODO: is this absolutely correct? what happens if "args.title" is not defined? may it works accidentally, because "args.title" or "args.slug" is always send?
      args.slug = args.slug || (await uniqueSlug(args.title, isUniqueFor(context, 'Post')))
      return resolve(root, args, context, info)
    },
  },
}

import walkRecursive from '../helpers/walkRecursive'
import { cleanHtml } from '../middleware/helpers/cleanHtml.js'

const fields = ['content', 'contentExcerpt', 'reasonDescription']

export default {
  Mutation: async (resolve, root, args, context, info) => {
    args = walkRecursive(args, fields, cleanHtml)
    return resolve(root, args, context, info)
  },
  Query: async (resolve, root, args, context, info) => {
    const result = await resolve(root, args, context, info)
    return walkRecursive(result, fields, cleanHtml)
  },
}

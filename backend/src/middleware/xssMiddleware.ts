import walkRecursive from '../helpers/walkRecursive'
import { cleanHtml } from '../middleware/helpers/cleanHtml'

// exclamation mark separetes field names, that should not be sanitized
const fields = [
  'content!message',
  'contentExcerpt',
  'reasonDescription',
  'description!embed',
  'descriptionExcerpt',
]

export default {
  Mutation: async (resolve, root, args, context, info) => {
    args = walkRecursive(args, fields, info.fieldName, cleanHtml)
    return resolve(root, args, context, info)
  },
  Query: async (resolve, root, args, context, info) => {
    const result = await resolve(root, args, context, info)
    return walkRecursive(result, fields, info.fieldName, cleanHtml)
  },
}

/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { cleanHtml } from './helpers/cleanHtml'

/**
 * iterate through all fields and replace it with the callback result
 * @property data Array
 * @property fields Array
 * @property fieldName String
 * @property callback Function
 */
const walkRecursive = (data, fields, fieldName, callback, _key?) => {
  if (!Array.isArray(fields)) {
    throw new Error('please provide an fields array for the walkRecursive helper')
  }
  const fieldDef = fields.find((f) => f.field === _key)
  if (data && typeof data === 'string' && fieldDef) {
    if (!fieldDef.excludes?.includes(fieldName)) data = callback(data, _key)
  } else if (data && Array.isArray(data)) {
    // go into the rabbit hole and dig through that array
    data.forEach((res, index) => {
      data[index] = walkRecursive(data[index], fields, fieldName, callback, index)
    })
  } else if (data && typeof data === 'object') {
    // lets get some keys and stir them
    Object.keys(data).forEach((k) => {
      data[k] = walkRecursive(data[k], fields, fieldName, callback, k)
    })
  }
  return data
}

// exclamation mark separates field names, that should not be sanitized
const fields = [
  { field: 'content', excludes: ['CreateMessage', 'Message'] },
  { field: 'contentExcerpt' },
  { field: 'reasonDescription' },
  { field: 'description', excludes: ['embed'] },
  { field: 'descriptionExcerpt' },
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

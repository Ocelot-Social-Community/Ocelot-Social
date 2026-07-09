/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import trunc from 'trunc-html'

import branding from '@src/branding'

import type { IMiddlewareResolver } from 'graphql-middleware/dist/types'

const createGroup: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  args.descriptionExcerpt = trunc(args.description, branding.group.descriptionExcerptLength).html
  return resolve(root, args, context, info)
}

const updateGroup: IMiddlewareResolver = async (resolve, root, args, context, info) => {
  if (args.description)
    args.descriptionExcerpt = trunc(args.description, branding.group.descriptionExcerptLength).html
  return resolve(root, args, context, info)
}

export default {
  Mutation: {
    CreateGroup: createGroup,
    UpdateGroup: updateGroup,
  },
}

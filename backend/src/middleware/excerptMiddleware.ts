/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import trunc from 'trunc-html'

import CONFIG from '@config/config'

export default {
  Mutation: {
    CreateGroup: async (resolve, root, args, context, info) => {
      args.descriptionExcerpt = trunc(args.description, CONFIG.DESCRIPTION_EXCERPT_HTML_LENGTH).html
      return resolve(root, args, context, info)
    },
    UpdateGroup: async (resolve, root, args, context, info) => {
      if (args.description)
        args.descriptionExcerpt = trunc(
          args.description,
          CONFIG.DESCRIPTION_EXCERPT_HTML_LENGTH,
        ).html
      return resolve(root, args, context, info)
    },
    CreatePost: async (resolve, root, args, context, info) => {
      args.contentExcerpt = trunc(args.content, 120).html
      return resolve(root, args, context, info)
    },
    UpdatePost: async (resolve, root, args, context, info) => {
      args.contentExcerpt = trunc(args.content, 120).html
      return resolve(root, args, context, info)
    },
    CreateComment: async (resolve, root, args, context, info) => {
      args.contentExcerpt = trunc(args.content, 180).html
      return resolve(root, args, context, info)
    },
    UpdateComment: async (resolve, root, args, context, info) => {
      args.contentExcerpt = trunc(args.content, 180).html
      return resolve(root, args, context, info)
    },
  },
}

import trunc from 'trunc-html'
import { GROUPDESCRIPTION_EXCERPT_HTML_LENGTH } from '../constants/groups'

export default {
  Mutation: {
    CreateGroup: async (resolve, root, args, context, info) => {
      args.groupDescriptionExcerpt = trunc(
        args.groupDescription,
        GROUPDESCRIPTION_EXCERPT_HTML_LENGTH,
      ).html
      return resolve(root, args, context, info)
    },
    UpdateGroup: async (resolve, root, args, context, info) => {
      if (args.groupDescription)
        args.groupDescriptionExcerpt = trunc(
          args.groupDescription,
          GROUPDESCRIPTION_EXCERPT_HTML_LENGTH,
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

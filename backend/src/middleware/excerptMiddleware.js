import trunc from 'trunc-html'

export default {
  Mutation: {
    CreateGroup: async (resolve, root, args, context, info) => {
      args.descriptionExcerpt = trunc(args.description, 120).html
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

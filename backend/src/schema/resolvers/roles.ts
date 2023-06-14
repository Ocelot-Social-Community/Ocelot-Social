export default {
  Query: {
    availableRoles: async (_parent, args, context, _resolveInfo) => {
      return ['admin', 'moderator', 'user']
    },
  },
}

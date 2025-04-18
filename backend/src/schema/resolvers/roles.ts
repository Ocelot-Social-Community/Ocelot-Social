export default {
  Query: {
    availableRoles: async (_parent, _args, _context, _resolveInfo) => {
      return ['admin', 'moderator', 'user']
    },
  },
}

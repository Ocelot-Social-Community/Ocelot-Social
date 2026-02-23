export default {
  Query: {
    availableRoles: (_parent, _args, _context, _resolveInfo) => {
      return ['admin', 'moderator', 'user']
    },
  },
}

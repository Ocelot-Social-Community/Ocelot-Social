const roomProperties = async (resolve, root, args, context, info) => {
  const resolved = await resolve(root, args, context, info)
  if (resolved) {
    resolved.forEach((room) => {
      if (room.users) {
        room.users.forEach((user) => {
          user._id = user.id
        })
      }
      if (room.lastMessage) {
        room.lastMessage._id = room.lastMessage.id
      }
    })
  }
  return resolved
}

export default {
  Query: {
    Room: roomProperties,
  },
}

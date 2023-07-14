import { isArray } from 'lodash'

const setRoomProps = (room) => {
  if (room.users) {
    room.users.forEach((user) => {
      user._id = user.id
    })
  }
  if (room.lastMessage) {
    room.lastMessage._id = room.lastMessage.id
  }
}

const setMessageProps = (message, context) => {
  message._id = message.id
  if (message.senderId !== context.user.id) {
    message.distributed = true
  }
}

const roomProperties = async (resolve, root, args, context, info) => {
  const resolved = await resolve(root, args, context, info)
  if (resolved) {
    if (isArray(resolved)) {
      resolved.forEach((room) => {
        setRoomProps(room)
      })
    } else {
      setRoomProps(resolved)
    }
  }
  return resolved
}

const messageProperties = async (resolve, root, args, context, info) => {
  const resolved = await resolve(root, args, context, info)
  if (resolved) {
    if (isArray(resolved)) {
      resolved.forEach((message) => {
        setMessageProps(message, context)
      })
    } else {
      setMessageProps(resolved, context)
    }
  }
  return resolved
}

export default {
  Query: {
    Room: roomProperties,
    Message: messageProperties,
  },
  Mutation: {
    CreateRoom: roomProperties,
  },
}

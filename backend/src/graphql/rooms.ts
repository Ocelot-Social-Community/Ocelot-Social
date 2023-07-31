import gql from 'graphql-tag'

export const createRoomMutation = () => {
  return gql`
    mutation ($userId: ID!) {
      CreateRoom(userId: $userId) {
        id
        roomId
        roomName
        lastMessageAt
        unreadCount
        #avatar
        users {
          _id
          id
          name
          avatar {
            url
          }
        }
      }
    }
  `
}

export const roomQuery = () => {
  return gql`
    query Room($first: Int, $offset: Int, $id: ID) {
      Room(first: $first, offset: $offset, id: $id, orderBy: lastMessageAt_desc) {
        id
        roomId
        roomName
        avatar
        lastMessageAt
        unreadCount
        lastMessage {
          _id
          id
          content
          senderId
          username
          avatar
          date
          saved
          distributed
          seen
        }
        users {
          _id
          id
          name
          avatar {
            url
          }
        }
      }
    }
  `
}

export const unreadRoomsQuery = () => {
  return gql`
    query {
      UnreadRooms
    }
  `
}

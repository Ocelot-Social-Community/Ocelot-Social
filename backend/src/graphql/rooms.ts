import gql from 'graphql-tag'

export const createRoomMutation = () => {
  return gql`
    mutation ($userId: ID!) {
      CreateRoom(userId: $userId) {
        id
        roomId
      }
    }
  `
}

export const roomQuery = () => {
  return gql`
    query {
      Room {
        id
        roomId
        roomName
        lastMessageAt
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

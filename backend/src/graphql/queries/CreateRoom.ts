import gql from 'graphql-tag'

export const CreateRoom = gql`
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

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

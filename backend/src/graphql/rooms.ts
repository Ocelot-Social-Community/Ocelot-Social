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
    query Room($first: Int, $offset: Int, $id: ID) {
      Room(first: $first, offset: $offset, id: $id, orderBy: createdAt_desc) {
        id
        roomId
        roomName
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

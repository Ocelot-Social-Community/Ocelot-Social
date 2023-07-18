import gql from 'graphql-tag'

export const roomQuery = () => gql`
  query Room($first: Int, $offset: Int, $id: ID) {
    Room(first: $first, offset: $offset, id: $id, orderBy: lastMessageAt_desc) {
      id
      roomId
      roomName
      avatar
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

export const createRoom = () => gql`
  mutation ($userId: ID!) {
    CreateRoom(userId: $userId) {
      id
      roomId
    }
  }
`

export const unreadRoomsQuery = () => {
  return gql`
    query {
      UnreadRooms
    }
  `
}

export const roomCountUpdated = () => {
  return gql`
    subscription roomCountUpdated($userId: ID!) {
      roomCountUpdated(userId: $userId)
    }
  `
}

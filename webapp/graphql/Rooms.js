import gql from 'graphql-tag'

export const roomQuery = () => gql`
  query Room($first: Int, $offset: Int, $id: ID) {
    Room(first: $first, offset: $offset, id: $id) {
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

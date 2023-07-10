import gql from 'graphql-tag'

export const roomQuery = () => gql`
  query {
    Room {
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

import gql from 'graphql-tag'

export const createRoomMutation = () => {
  return gql`
    mutation (
      $userId: ID!
    ) {
      CreateRoom(
        userId: $userId
      ) {
        id
      }
    }
  `
}

export const roomQuery = () => {
  return gql`
    query {
      Room {
        id
        users {
          id
        }
      }
    }
  `
}

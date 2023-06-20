import gql from 'graphql-tag'

export const createMessageMutation = () => {
  return gql`
    mutation (
      $roomId: ID!
      $content: String!
    ) {
      CreateMessage(
        roomId: $roomId
        content: $content
      ) {
        id
        content
      }
    }
  `
}

export const messageQuery = () => {
  return gql`
    query($roomId: ID!) {
      Message(roomId: $roomId) {
        id
        content
        author {
          id
        }
      }
    }
  `
}

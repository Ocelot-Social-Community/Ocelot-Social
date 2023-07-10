import gql from 'graphql-tag'

export const messageQuery = () => {
  return gql`
    query ($roomId: ID!) {
      Message(roomId: $roomId) {
        _id
        id
        senderId
        content
        author {
          id
        }
      }
    }
  `
}

export const createMessageMutation = () => {
  return gql`
    mutation ($roomId: ID!, $content: String!) {
      CreateMessage(roomId: $roomId, content: $content) {
        id
        content
      }
    }
  `
}

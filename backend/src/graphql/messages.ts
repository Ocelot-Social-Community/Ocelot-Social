import gql from 'graphql-tag'

export const createMessageMutation = () => {
  return gql`
    mutation ($roomId: ID!, $content: String!) {
      CreateMessage(roomId: $roomId, content: $content) {
        id
        content
        saved
        distributed
        seen
      }
    }
  `
}

export const messageQuery = () => {
  return gql`
    query ($roomId: ID!) {
      Message(roomId: $roomId) {
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
    }
  `
}

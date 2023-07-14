import gql from 'graphql-tag'

export const messageQuery = () => {
  return gql`
    query ($roomId: ID!, $first: Int, $offset: Int) {
      Message(roomId: $roomId, first: $first, offset: $offset, orderBy: createdAt_desc) {
        _id
        id
        indexId
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

export const markMessagesAsSeen = () => {
  return gql`
    mutation ($messageIds: [String!]) {
      MarkMessagesAsSeen(messageIds: $messageIds)
    }
  `
}

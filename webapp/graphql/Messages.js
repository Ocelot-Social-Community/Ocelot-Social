import gql from 'graphql-tag'

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

export const messageQuery = () => {
  return gql`
    query ($roomId: ID!, $first: Int, $offset: Int) {
      Message(roomId: $roomId, first: $first, offset: $offset, orderBy: indexId_desc) {
        _id
        id
        indexId
        content
        senderId
        author {
          id
        }
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

export const chatMessageAdded = () => {
  return gql`
    subscription chatMessageAdded($userId: ID!) {
      chatMessageAdded(userId: $userId) {
        _id
        id
        indexId
        content
        senderId
        author {
          id
        }
        username
        avatar
        date
        room {
          id
        }
        saved
        distributed
        seen
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

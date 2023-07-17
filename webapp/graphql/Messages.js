import gql from 'graphql-tag'

export const messageQuery = () => {
  return gql`
    query ($roomId: ID!, $first: Int, $offset: Int) {
      Message(roomId: $roomId, first: $first, offset: $offset, orderBy: createdAt_desc) {
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

export const chatMessageAdded = () => {
  return gql`
    subscription chatMessageAdded($userId: ID!) {
      chatMessageAdded(userId: $userId) {
        id
        room {
          id
        }
      }
    }
  `
}

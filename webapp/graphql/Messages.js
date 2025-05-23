import gql from 'graphql-tag'

export const createMessageMutation = () => {
  return gql`
    mutation ($roomId: ID!, $content: String, $images: [ImageInput]) {
      CreateMessage(roomId: $roomId, content: $content, images: $images) {
        #_id
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
        files
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
        room {
          id
        }
        saved
        distributed
        seen
        images
      }
    }
  `
}

export const chatMessageAdded = () => {
  return gql`
    subscription chatMessageAdded {
      chatMessageAdded {
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
        images
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

import gql from 'graphql-tag'

export const createMessageMutation = () => {
  return gql`
    mutation ($roomId: ID, $userId: ID, $content: String, $files: [FileInput]) {
      CreateMessage(roomId: $roomId, userId: $userId, content: $content, files: $files) {
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
        files {
          url
          name
          #size
          type
          #preview
        }
      }
    }
  `
}

export const messageQuery = () => {
  return gql`
    query ($roomId: ID!, $first: Int, $offset: Int, $beforeIndex: Int) {
      Message(roomId: $roomId, first: $first, offset: $offset, beforeIndex: $beforeIndex, orderBy: indexId_desc) {
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
        files {
          url
          name
          #size
          type
          #audio
          #duration
          #preview
        }
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
        files {
          url
          name
          #size
          type
          #audio
          #duration
          #preview
        }
      }
    }
  `
}

export const chatMessageStatusUpdated = () => {
  return gql`
    subscription chatMessageStatusUpdated {
      chatMessageStatusUpdated {
        roomId
        messageIds
        status
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

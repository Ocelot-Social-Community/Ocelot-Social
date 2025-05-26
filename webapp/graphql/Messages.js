import gql from 'graphql-tag'

export const createMessageMutation = () => {
  return gql`
    mutation ($roomId: ID!, $content: String, $files: [FileInput]) {
      CreateMessage(roomId: $roomId, content: $content, files: $files) {
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
          size
          type
          url
          preview
        }
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
        files {
          name
          size
          type
          audio
          duration
          url
          preview
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
          name
          size
          type
          audio
          duration
          url
          preview
        }
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

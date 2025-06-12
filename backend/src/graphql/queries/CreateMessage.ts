import gql from 'graphql-tag'

export const CreateMessage = gql`
  mutation ($roomId: ID!, $content: String!, $files: [FileInput]! = []) {
    CreateMessage(roomId: $roomId, content: $content, files: $files) {
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

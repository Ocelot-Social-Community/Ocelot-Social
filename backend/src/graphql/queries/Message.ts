import gql from 'graphql-tag'

export const Message = gql`
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
      files {
        url
        #name
        #size
        type
        #preview
      }
    }
  }
`

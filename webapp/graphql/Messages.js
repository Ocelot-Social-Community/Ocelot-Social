import gql from 'graphql-tag'

export const messageQuery = () => {
  return gql`
    query($roomId: ID!) {
      Message(roomId: $roomId) {
        id
        content
        author {
          id
        }
      }
    }
  `
}


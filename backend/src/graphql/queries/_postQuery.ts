import gql from 'graphql-tag'

export const postQuery = gql`
  query Post($id: ID!) {
    Post(id: $id) {
      id
      title
      content
    }
  }
`

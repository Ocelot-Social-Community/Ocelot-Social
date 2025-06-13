import gql from 'graphql-tag'

export const pushPost = gql`
  mutation pushPost($id: ID!) {
    pushPost(id: $id) {
      id
    }
  }
`

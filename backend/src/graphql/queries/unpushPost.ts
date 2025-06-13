import gql from 'graphql-tag'

export const unpushPost = gql`
  mutation unpushPost($id: ID!) {
    unpushPost(id: $id) {
      id
    }
  }
`

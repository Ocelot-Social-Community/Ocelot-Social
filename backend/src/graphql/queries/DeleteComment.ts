import gql from 'graphql-tag'

export const DeleteComment = gql`
  mutation ($id: ID!) {
    DeleteComment(id: $id) {
      id
      content
      contentExcerpt
      deleted
    }
  }
`

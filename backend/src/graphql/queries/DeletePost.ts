import gql from 'graphql-tag'

export const DeletePost = gql`
  mutation ($id: ID!) {
    DeletePost(id: $id) {
      id
      deleted
      content
      contentExcerpt
      image {
        url
      }
      comments {
        deleted
        content
        contentExcerpt
      }
    }
  }
`

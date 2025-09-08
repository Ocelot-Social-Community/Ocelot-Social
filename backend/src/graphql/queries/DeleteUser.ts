import gql from 'graphql-tag'

export const DeleteUser = gql`
  mutation ($id: ID!, $resource: [Deletable]) {
    DeleteUser(id: $id, resource: $resource) {
      id
      name
      about
      deleted
      contributions {
        id
        content
        contentExcerpt
        deleted
        comments {
          id
          content
          contentExcerpt
          deleted
        }
      }
      comments {
        id
        content
        contentExcerpt
        deleted
      }
    }
  }
`

import gql from 'graphql-tag'

export const UpdateComment = gql`
  mutation ($content: String!, $id: ID!) {
    UpdateComment(content: $content, id: $id) {
      id
      content
      createdAt
      updatedAt
    }
  }
`

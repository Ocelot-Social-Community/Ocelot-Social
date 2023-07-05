import gql from 'graphql-tag'

// ------ mutations

export const createCommentMutation = gql`
  mutation ($id: ID, $postId: ID!, $content: String!) {
    CreateComment(id: $id, postId: $postId, content: $content) {
      id
    }
  }
`

// ------ queries

// fill queries in here

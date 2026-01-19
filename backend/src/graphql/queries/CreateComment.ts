import gql from 'graphql-tag'

export const CreateComment = gql`
  mutation ($id: ID, $postId: ID!, $content: String!) {
    CreateComment(id: $id, postId: $postId, content: $content) {
      id
      content
      author {
        name
      }
      isPostObservedByMe
      postObservingUsersCount
    }
  }
`

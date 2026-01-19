import gql from 'graphql-tag'

export const PostsEmotionsByCurrentUser = gql`
  query ($postId: ID!) {
    PostsEmotionsByCurrentUser(postId: $postId)
  }
`

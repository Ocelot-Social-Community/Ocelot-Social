import gql from 'graphql-tag'

export const PostsEmotionsCountByEmotion = gql`
  query ($postId: ID!, $data: _EMOTEDInput!) {
    PostsEmotionsCountByEmotion(postId: $postId, data: $data)
  }
`

import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export default () => {
  return gql`
    ${imageUrls}

    query Comment($postId: ID) {
      Comment(postId: $postId) {
        id
        content
        createdAt
        author {
          id
          slug
          name
          avatar {
            ...imageUrls
          }
          disabled
          deleted
          shoutedCount
          contributionsCount
          commentedCount
          followedByCount
          followedByCurrentUser
          badgeTrophies {
            id
            icon
          }
        }
      }
    }
  `
}

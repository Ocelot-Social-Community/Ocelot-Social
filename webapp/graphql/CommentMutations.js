import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export default () => {
  return {
    CreateComment: gql`
      ${imageUrls}

      mutation ($postId: ID!, $content: String!) {
        CreateComment(postId: $postId, content: $content) {
          id

          content
          createdAt
          updatedAt
          disabled
          deleted
          isPostObservedByMe
          postObservingUsersCount
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
    `,
    UpdateComment: gql`
      ${imageUrls}

      mutation ($content: String!, $id: ID!) {
        UpdateComment(content: $content, id: $id) {
          id

          content
          createdAt
          updatedAt
          disabled
          deleted
          author {
            id
            slug
            name
            avatar {
              ...imageUrls
            }
            disabled
            deleted
          }
        }
      }
    `,
    DeleteComment: gql`
      ${imageUrls}

      mutation ($id: ID!) {
        DeleteComment(id: $id) {
          id

          content
          createdAt
          disabled
          deleted
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
    `,
  }
}

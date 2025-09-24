import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export default (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return {
    CreateComment: gql`
      ${imageUrls}

      mutation ($postId: ID!, $content: String!) {
        CreateComment(postId: $postId, content: $content) {
          id
          contentExcerpt
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
          contentExcerpt
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

      mutation($id: ID!) {
        DeleteComment(id: $id) {
          id
          contentExcerpt
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
            location {
              name: name${lang}
            }
            badges {
              id
              icon
            }
          }
        }
      }
    `,
  }
}

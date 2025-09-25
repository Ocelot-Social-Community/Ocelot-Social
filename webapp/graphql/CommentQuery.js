import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export default (app) => {
  const lang = app.$i18n.locale().toUpperCase()
  return gql`
    ${imageUrls}

    query Comment($postId: ID) {
      Comment(postId: $postId) {
        id
        contentExcerpt
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
  `
}

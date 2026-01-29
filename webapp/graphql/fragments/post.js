import gql from 'graphql-tag'
import { imageUrls } from './imageUrls'

export const post = gql`
  ${imageUrls}

  fragment post on Post {
    id
    title
    content
    contentExcerpt
    createdAt
    updatedAt
    sortDate
    disabled
    deleted
    slug
    language
    image {
      ...imageUrls
      sensitive
      aspectRatio
      type
    }
    author {
      ...user
    }
    pinnedAt
    pinned
    groupPinned
    isObservedByMe
    observingUsersCount
    group {
      id
      name
      slug
      groupType
      myRole
      currentlyPinnedPostsCount
    }
  }
`

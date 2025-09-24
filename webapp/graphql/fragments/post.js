import gql from 'graphql-tag'

export const post = gql`
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
      url
      w320: transform(width: 320)
      w640: transform(width: 640)
      w1024: transform(width: 1024)
      sensitive
      aspectRatio
      type
    }
    author {
      ...user
    }
    pinnedAt
    pinned
    isObservedByMe
    observingUsersCount
  }
`

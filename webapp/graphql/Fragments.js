import gql from 'graphql-tag'

export const userFragment = gql`
  fragment user on User {
    id
    slug
    name
    avatar {
      url
    }
    disabled
    deleted
  }
`

export const locationAndBadgesFragment = (lang) => gql`
  fragment locationAndBadges on User {
    location {
      name: name${lang}
    }
    badges {
      id
      icon
    }
  }
`

export const userCountsFragment = gql`
  fragment userCounts on User {
    shoutedCount
    contributionsCount
    commentedCount
    followedByCount
    followingCount
    followedByCurrentUser
  }
`

export const postFragment = gql`
  fragment post on Post {
    id
    title
    content
    contentExcerpt
    createdAt
    updatedAt
    disabled
    deleted
    slug
    language
    image {
      url
      sensitive
      aspectRatio
      type
    }
    author {
      ...user
    }
    pinnedAt
    pinned
  }
`

export const groupFragment = gql`
  fragment group on Group {
    id
    groupName: name
    slug
    disabled
    deleted
    about
    description
    descriptionExcerpt
    groupType
    actionRadius
    categories {
      id
      slug
      name
      icon
    }
    locationName
    myRole
  }
`

export const postCountsFragment = gql`
  fragment postCounts on Post {
    commentsCount
    shoutedCount
    shoutedByCurrentUser
    emotionsCount
    clickedCount
    viewedTeaserCount
    viewedTeaserByCurrentUser
  }
`

export const tagsCategoriesAndPinnedFragment = gql`
  fragment tagsCategoriesAndPinned on Post {
    tags {
      id
    }
    categories {
      id
      slug
      name
      icon
    }
    pinnedBy {
      id
      name
      role
    }
  }
`

export const commentFragment = gql`
  fragment comment on Comment {
    id
    createdAt
    updatedAt
    disabled
    deleted
    content
    contentExcerpt
  }
`

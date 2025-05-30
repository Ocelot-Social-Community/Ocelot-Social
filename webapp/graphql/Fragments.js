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

export const locationFragment = (lang) => gql`
  fragment location on User {
    locationName
    location {
      id
      name: name${lang}
      lng
      lat
      distanceToMe
    }
  }
`

export const badgesFragment = gql`
  fragment badges on User {
    badgeTrophiesSelected {
      id
      icon
      description
    }
    badgeVerification {
      id
      icon
      description
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

export const userTeaserFragment = (lang) => gql`
  ${badgesFragment}
  ${locationFragment(lang)}

  fragment userTeaser on User {
    followedByCount
    contributionsCount
    commentedCount
    ...badges
    ...location
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
    isObservedByMe
    observingUsersCount
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
    isPostObservedByMe
    postObservingUsersCount
    shoutedByCurrentUser
    shoutedCount
  }
`

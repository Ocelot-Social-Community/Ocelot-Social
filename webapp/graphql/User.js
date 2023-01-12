import gql from 'graphql-tag'
import {
  userCountsFragment,
  locationFragment,
  badgesFragment,
  userFragment,
  postFragment,
  commentFragment,
} from './Fragments'

export const profileUserQuery = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${userFragment}
    ${userCountsFragment}
    ${locationFragment(lang)}
    ${badgesFragment}

    query User($id: ID!, $followedByCount: Int!, $followingCount: Int!) {
      User(id: $id) {
        ...user
        ...userCounts
        ...location
        ...badges
        about
        createdAt
        followedByCurrentUser
        isMuted
        isBlocked
        blocked
        following(first: $followingCount) {
          ...user
          ...userCounts
          ...location
          ...badges
        }
        followedBy(first: $followedByCount) {
          ...user
          ...userCounts
          ...location
          ...badges
        }
        socialMedia {
          id
          url
        }
        showShoutsPublicly
        sendNotificationEmails
      }
    }
  `
}

export const minimisedUserQuery = () => {
  return gql`
    query ($slug: String) {
      User(slug: $slug, orderBy: slug_asc) {
        id
        slug
        name
        avatar {
          url
        }
      }
    }
  `
}

export const adminUserQuery = () => {
  return gql`
    query ($filter: _UserFilter, $first: Int, $offset: Int, $email: String) {
      User(
        email: $email
        filter: $filter
        first: $first
        offset: $offset
        orderBy: createdAt_desc
      ) {
        id
        name
        slug
        email
        role
        createdAt
        contributionsCount
        commentedCount
        shoutedCount
      }
    }
  `
}

export const mapUserQuery = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${userFragment}
    ${locationFragment(lang)}
    ${badgesFragment}

    query {
      User {
        ...user
        ...location
        ...badges
      }
    }
  `
}

export const notificationQuery = (i18n) => {
  return gql`
    ${userFragment}
    ${commentFragment}
    ${postFragment}

    query ($read: Boolean, $orderBy: NotificationOrdering, $first: Int, $offset: Int) {
      notifications(read: $read, orderBy: $orderBy, first: $first, offset: $offset) {
        id
        read
        reason
        createdAt
        updatedAt
        from {
          __typename
          ... on Post {
            ...post
            author {
              ...user
            }
          }
          ... on Comment {
            ...comment
            author {
              ...user
            }
            post {
              ...post
              author {
                ...user
              }
            }
          }
        }
      }
    }
  `
}

export const markAsReadMutation = (i18n) => {
  return gql`
    ${userFragment}
    ${commentFragment}
    ${postFragment}

    mutation ($id: ID!) {
      markAsRead(id: $id) {
        id
        read
        reason
        createdAt
        updatedAt
        from {
          __typename
          ... on Post {
            ...post
            author {
              ...user
            }
          }
          ... on Comment {
            ...comment
            post {
              ...post
              author {
                ...user
              }
            }
          }
        }
      }
    }
  `
}

export const notificationAdded = () => {
  return gql`
    ${userFragment}
    ${commentFragment}
    ${postFragment}

    subscription notifications($userId: ID!) {
      notificationAdded(userId: $userId) {
        id
        read
        reason
        createdAt
        updatedAt
        from {
          __typename
          ... on Post {
            ...post
            author {
              ...user
            }
          }
          ... on Comment {
            ...comment
            author {
              ...user
            }
            post {
              ...post
              author {
                ...user
              }
            }
          }
        }
      }
    }
  `
}
export const followUserMutation = (i18n) => {
  return gql`
    ${userFragment}
    ${userCountsFragment}

    mutation ($id: ID!) {
      followUser(id: $id) {
        ...user
        ...userCounts
        followedByCount
        followedByCurrentUser
        followedBy(first: 7) {
          ...user
          ...userCounts
        }
      }
    }
  `
}

export const unfollowUserMutation = (i18n) => {
  return gql`
    ${userFragment}
    ${userCountsFragment}

    mutation ($id: ID!) {
      unfollowUser(id: $id) {
        ...user
        ...userCounts
        followedByCount
        followedByCurrentUser
        followedBy(first: 7) {
          ...user
          ...userCounts
        }
      }
    }
  `
}

export const updateUserMutation = () => {
  return gql`
    mutation (
      $id: ID!
      $slug: String
      $name: String
      $about: String
      $allowEmbedIframes: Boolean
      $showShoutsPublicly: Boolean
      $sendNotificationEmails: Boolean
      $termsAndConditionsAgreedVersion: String
      $avatar: ImageInput
      $locationName: String # empty string '' sets it to null
    ) {
      UpdateUser(
        id: $id
        slug: $slug
        name: $name
        about: $about
        allowEmbedIframes: $allowEmbedIframes
        showShoutsPublicly: $showShoutsPublicly
        sendNotificationEmails: $sendNotificationEmails
        termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
        avatar: $avatar
        locationName: $locationName
      ) {
        id
        slug
        name
        locationName
        about
        allowEmbedIframes
        showShoutsPublicly
        sendNotificationEmails
        locale
        termsAndConditionsAgreedVersion
        avatar {
          url
        }
      }
    }
  `
}

export const checkSlugAvailableQuery = gql`
  query ($slug: String!) {
    User(slug: $slug) {
      slug
    }
  }
`

export const currentUserQuery = gql`
  ${userFragment}
  query {
    currentUser {
      ...user
      email
      role
      about
      locationName
      locale
      allowEmbedIframes
      showShoutsPublicly
      sendNotificationEmails
      termsAndConditionsAgreedVersion
      socialMedia {
        id
        url
      }
      activeCategories
    }
  }
`

export const currentUserCountQuery = () => gql`
  ${userCountsFragment}
  query {
    currentUser {
      ...userCounts
    }
  }
`

export const userDataQuery = (i18n) => {
  return gql`
    ${userFragment}
    ${postFragment}
    ${commentFragment}
    query ($id: ID!) {
      userData(id: $id) {
        user {
          ...user
        }
        posts {
          ...post
          categories {
            id
            name
          }
          comments {
            author {
              id
              slug
            }
            ...comment
          }
        }
      }
    }
  `
}

import gql from 'graphql-tag'
import {
  userCountsFragment,
  locationFragment,
  badgesFragment,
  userFragment,
  postFragment,
  commentFragment,
  groupFragment,
  userTeaserFragment,
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

export const adminUserBadgesQuery = () => {
  return gql`
    query User($id: ID!) {
      User(id: $id) {
        id
        name
        badgeTrophies {
          id
        }
        badgeVerification {
          id
        }
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
        about
        ...location
        ...badges
      }
    }
  `
}

export const notificationQuery = () => {
  return gql`
    ${userFragment}
    ${commentFragment}
    ${postFragment}
    ${groupFragment}

    query ($read: Boolean, $orderBy: NotificationOrdering, $first: Int, $offset: Int) {
      notifications(read: $read, orderBy: $orderBy, first: $first, offset: $offset) {
        id
        read
        reason
        createdAt
        updatedAt
        to {
          ...user
        }
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
          ... on Group {
            ...group
          }
        }
        relatedUser {
          ...user
        }
      }
    }
  `
}

export const markAsReadMutation = (_i18n) => {
  return gql`
    ${userFragment}
    ${commentFragment}
    ${postFragment}
    ${groupFragment}

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
          ... on Group {
            ...group
          }
        }
      }
    }
  `
}

export const markAllAsReadMutation = (_i18n) => {
  return gql`
    ${userFragment}
    ${commentFragment}
    ${postFragment}
    ${groupFragment}

    mutation {
      markAllAsRead {
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
          ... on Group {
            ...group
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
    ${groupFragment}

    subscription notifications {
      notificationAdded {
        id
        read
        reason
        createdAt
        updatedAt
        to {
          ...user
        }
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
          ... on Group {
            ...group
          }
        }
        relatedUser {
          ...user
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
      $emailNotificationSettings: [EmailNotificationSettingsInput]
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
        emailNotificationSettings: $emailNotificationSettings
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
        emailNotificationSettings {
          type
          settings {
            name
            value
          }
        }
        locale
        termsAndConditionsAgreedVersion
        avatar {
          url
        }
        badgeVerification {
          id
          description
          icon
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
      inviteCodes {
        code
        isValid
        redeemedBy {
          id
        }
        comment
        redeemedByCount
      }
      badgeTrophiesSelected {
        id
        icon
        description
        isDefault
      }
      badgeTrophiesUnused {
        id
        icon
        description
      }
      badgeVerification {
        id
        icon
        description
      }
      email
      role
      about
      locationName
      locale
      allowEmbedIframes
      showShoutsPublicly
      emailNotificationSettings {
        type
        settings {
          name
          value
        }
      }
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

export const userTeaserQuery = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${userTeaserFragment(lang)}
    query ($id: ID!) {
      User(id: $id) {
        ...userTeaser
      }
    }
  `
}

export const setTrophyBadgeSelected = gql`
  mutation ($slot: Int!, $badgeId: ID) {
    setTrophyBadgeSelected(slot: $slot, badgeId: $badgeId) {
      badgeTrophiesCount
      badgeTrophiesSelected {
        id
        icon
        description
        isDefault
      }
      badgeTrophiesUnused {
        id
        icon
        description
      }
      badgeTrophiesUnusedCount
    }
  }
`

export const resetTrophyBadgesSelected = gql`
  mutation {
    resetTrophyBadgesSelected {
      badgeTrophiesCount
      badgeTrophiesSelected {
        id
        icon
        description
        isDefault
      }
      badgeTrophiesUnused {
        id
        icon
        description
      }
      badgeTrophiesUnusedCount
    }
  }
`

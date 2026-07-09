import gql from 'graphql-tag'
import { badges } from './fragments/badges'
import { location } from './fragments/location'
import { userCounts } from './fragments/userCounts'
import { user } from './fragments/user'
import { post } from './fragments/post'
import { comment } from './fragments/comment'
import { group } from './fragments/group'
import { imageUrls } from './fragments/imageUrls'
import { notificationMutationResponse } from './fragments/notification'

export const profileUserQuery = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${user}
    ${userCounts}
    ${location('User', lang)}
    ${badges}

    query User($id: ID!) {
      User(id: $id) {
        ...user
        ...userCounts
        ...locationOnUser
        ...badges
        about
        createdAt
        followedByCurrentUser
        isMuted
        isBlocked
        blocked
        socialMedia {
          id
          url
        }
        showShoutsPublicly
      }
    }
  `
}

export const followConnectionsQuery = (type, i18n) => {
  const lang = i18n.locale().toUpperCase()
  const countField = `${type}Count`
  return gql`
    ${user}
    ${userCounts}
    ${location('User', lang)}
    ${badges}

    query FollowConnections($id: ID!, $first: Int!, $offset: Int!) {
      User(id: $id) {
        id
        ${type}(first: $first, offset: $offset) {
          ...user
          ...userCounts
          ...locationOnUser
          ...badges
        }
        ${countField}
      }
    }
  `
}

export const minimisedUserQuery = () => {
  return gql`
    ${imageUrls}

    query ($slug: String) {
      User(slug: $slug, orderBy: slug_asc) {
        id
        slug
        name
        avatar {
          ...imageUrls
        }
      }
    }
  `
}

// email and roleName are field-gated in the backend (user.email.readAny / role.manage),
// so a viewer lacking the right must NOT request the field — a denied field aborts the
// whole response under apollo's default errorPolicy. Callers pass withEmail/withRole
// from their $can checks; the role-filtered area (moderation) omits them.
export const adminUserQuery = ({ withEmail = true, withRole = true } = {}) => {
  return gql`
    query ($first: Int, $offset: Int, $roleName: String, $search: String) {
      User(
        roleName: $roleName
        search: $search
        first: $first
        offset: $offset
        orderBy: createdAt_desc
      ) {
        id
        name
        slug
        ${withEmail ? 'email' : ''}
        ${withRole ? 'roleName' : ''}
        createdAt
        disabled
        contributionsCount
        commentedCount
        shoutedCount
      }
    }
  `
}

// Delete a user account (and optionally their posts/comments via `resource`). Gated
// server-side by `or(isDeletingOwnAccount, user.delete.any)`; the admin/moderation
// user list uses it for other accounts, passing an empty `resource` (account only).
export const deleteUserMutation = () => {
  return gql`
    mutation ($id: ID!, $resource: [Deletable]) {
      DeleteUser(id: $id, resource: $resource) {
        id
      }
    }
  `
}

// Reversibly disable (deactivate) or re-enable a user account. Gated server-side by
// `and(user.disable, canActOnTargetUser)` — the moderator-grade, reversible counterpart
// to the irreversible, admin-only DeleteUser. Used by the shared admin/moderation list.
export const disableUserMutation = () => {
  return gql`
    mutation ($id: ID!, $disable: Boolean!) {
      disableUser(id: $id, disable: $disable) {
        id
        disabled
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
    ${user}
    ${location('User', lang)}
    ${badges}

    query {
      User {
        ...user
        about
        ...locationOnUser
        ...badges
      }
    }
  `
}

export const notificationQuery = () => {
  return gql`
    ${user}
    ${comment}
    ${post}
    ${group}

    query Notifications($read: Boolean, $orderBy: NotificationOrdering, $first: Int, $offset: Int) {
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
    ${notificationMutationResponse}

    mutation ($id: ID!) {
      markAsRead(id: $id) {
        ...notificationMutationResponse
      }
    }
  `
}

export const markAsUnreadMutation = (_i18n) => {
  return gql`
    ${notificationMutationResponse}

    mutation ($id: ID!) {
      markAsUnread(id: $id) {
        ...notificationMutationResponse
      }
    }
  `
}

export const markAllAsReadMutation = (_i18n) => {
  return gql`
    ${notificationMutationResponse}

    mutation {
      markAllAsRead {
        ...notificationMutationResponse
      }
    }
  `
}

export const notificationAdded = () => {
  return gql`
    ${user}
    ${comment}
    ${post}
    ${group}

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
    ${user}
    ${userCounts}

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
    ${user}
    ${userCounts}

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
    ${imageUrls}

    mutation (
      $id: ID!
      $slug: String
      $name: String
      $about: String
      $allowEmbedIframes: Boolean
      $showShoutsPublicly: Boolean
      $showPublicGroupsOnProfile: Boolean
      $showClosedGroupsOnProfile: Boolean
      $showHiddenGroupsOnProfile: Boolean
      $emailNotificationSettings: [EmailNotificationSettingsInput]
      $termsAndConditionsAgreedVersion: String
      $avatar: ImageInput
      $locationName: String # empty string '' sets it to null
      $locale: String
    ) {
      UpdateUser(
        id: $id
        slug: $slug
        name: $name
        about: $about
        allowEmbedIframes: $allowEmbedIframes
        showShoutsPublicly: $showShoutsPublicly
        showPublicGroupsOnProfile: $showPublicGroupsOnProfile
        showClosedGroupsOnProfile: $showClosedGroupsOnProfile
        showHiddenGroupsOnProfile: $showHiddenGroupsOnProfile
        emailNotificationSettings: $emailNotificationSettings
        termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
        avatar: $avatar
        locationName: $locationName
        locale: $locale
      ) {
        id
        slug
        name
        locationName
        about
        allowEmbedIframes
        showShoutsPublicly
        showPublicGroupsOnProfile
        showClosedGroupsOnProfile
        showHiddenGroupsOnProfile
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
          ...imageUrls
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
  ${user}
  query {
    currentUser {
      ...user
      inviteCodes {
        code
        createdAt
        isValid
        redeemedBy {
          id
          name
          slug
          avatar {
            ...imageUrls
          }
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
      roleName
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
    myPermissions {
      key
      group
    }
  }
`

export const currentUserCountQuery = () => gql`
  ${userCounts}
  query {
    currentUser {
      ...userCounts
    }
  }
`

export const userDataQuery = (i18n) => {
  return gql`
    ${user}
    ${post}
    ${comment}
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
    ${user}
    ${badges}
    ${location('User', lang)}

    query ($id: ID!) {
      User(id: $id) {
        ...user
        about
        followedByCount
        contributionsCount
        commentedCount
        ...badges
        ...locationOnUser
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

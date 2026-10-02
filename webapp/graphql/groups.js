import gql from 'graphql-tag'
import { location } from './fragments/location'
import { imageUrls } from './fragments/imageUrls'

// ------ mutations

export const createGroupMutation = () => {
  return gql`
    mutation (
      $id: ID
      $name: String!
      $slug: String
      $about: String
      $description: String!
      $visibility: GroupVisibility!
      $actionRadius: GroupActionRadius!
      $categoryIds: [ID]
      $locationName: String # empty string '' sets it to null
      $lat: Float
      $lng: Float
      $showMembers: Boolean
    ) {
      CreateGroup(
        id: $id
        name: $name
        slug: $slug
        about: $about
        description: $description
        visibility: $visibility
        actionRadius: $actionRadius
        categoryIds: $categoryIds
        locationName: $locationName
        lat: $lat
        lng: $lng
        showMembers: $showMembers
      ) {
        id
        name
        slug
        createdAt
        updatedAt
        disabled
        deleted
        about
        description
        visibility
        actionRadius
        categories {
          id
          slug
          name
          icon
        }
        locationName
        myGroupRole {
          name
          label
        }
        myGroupPermissions
        showMembers
      }
    }
  `
}

export const updateGroupMutation = () => {
  return gql`
    ${imageUrls}

    mutation (
      $id: ID!
      $name: String
      $slug: String
      $about: String
      $description: String
      $visibility: GroupVisibility
      $actionRadius: GroupActionRadius
      $categoryIds: [ID]
      $avatar: ImageInput
      $locationName: String # empty string '' sets it to null
      $lat: Float
      $lng: Float
      $showMembers: Boolean
    ) {
      UpdateGroup(
        id: $id
        name: $name
        slug: $slug
        about: $about
        description: $description
        visibility: $visibility
        actionRadius: $actionRadius
        categoryIds: $categoryIds
        avatar: $avatar
        locationName: $locationName
        lat: $lat
        lng: $lng
        showMembers: $showMembers
      ) {
        id
        name
        slug
        createdAt
        updatedAt
        disabled
        deleted
        about
        description
        visibility
        actionRadius
        categories {
          id
          slug
          name
          icon
        }
        avatar {
          ...imageUrls
        }
        locationName
        myGroupRole {
          name
          label
        }
        myGroupPermissions
        showMembers
      }
    }
  `
}

export const joinGroupMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!) {
      JoinGroup(groupId: $groupId, userId: $userId) {
        user {
          id
          name
          slug
        }
        membership {
          role
        }
      }
    }
  `
}

export const leaveGroupMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!) {
      LeaveGroup(groupId: $groupId, userId: $userId) {
        user {
          id
          name
          slug
        }
        membership {
          role
        }
      }
    }
  `
}

export const removeUserFromGroupMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!) {
      RemoveUserFromGroup(groupId: $groupId, userId: $userId) {
        user {
          id
          name
          slug
        }
        membership {
          role
        }
      }
    }
  `
}

// ------ queries

export const myGroupsForPostCreation = () => gql`
  query {
    Group(isMember: true) {
      id
      name
      slug
      visibility
      categories {
        id
        slug
      }
    }
  }
`

export const groupQuery = (i18n) => {
  const lang = i18n ? i18n.locale().toUpperCase() : 'EN'
  return gql`
    ${location('Group', lang)}
    ${imageUrls}

    query ($isMember: Boolean, $id: ID, $slug: String, $first: Int, $offset: Int) {
      Group(isMember: $isMember, id: $id, slug: $slug, first: $first, offset: $offset) {
        id
        name
        slug
        createdAt
        updatedAt
        disabled
        deleted
        about
        description
        visibility
        actionRadius
        isMutedByMe
        categories {
          id
          slug
          name
          icon
        }
        avatar {
          ...imageUrls
        }
        ...locationOnGroup
        membersCount
        myGroupRole {
          name
          label
        }
        myGroupPermissions
        showMembers
      }
    }
  `
}

export const groupEditQuery = () => {
  return gql`
    ${imageUrls}

    query ($id: ID) {
      Group(id: $id) {
        id
        name
        slug
        about
        description
        visibility
        actionRadius
        locationName
        categories {
          id
          slug
          name
          icon
        }
        avatar {
          ...imageUrls
        }
        myGroupRole {
          name
          label
        }
        myGroupPermissions
        showMembers
        inviteCodes {
          createdAt
          code
          isValid
          redeemedBy {
            id
          }
          comment
          redeemedByCount
        }
      }
    }
  `
}

export const groupMembersQuery = () => {
  return gql`
    ${imageUrls}

    query ($id: ID!, $first: Int, $offset: Int, $includePending: Boolean, $nameFilter: String) {
      GroupMembers(
        id: $id
        first: $first
        offset: $offset
        includePending: $includePending
        nameFilter: $nameFilter
      ) {
        user {
          id
          name
          slug
          avatar {
            ...imageUrls
          }
        }
        membership {
          role
        }
      }
    }
  `
}

export const groupShowMembersChangedSubscription = () => {
  return gql`
    subscription GroupShowMembersChanged($groupId: ID!) {
      groupShowMembersChanged(groupId: $groupId) {
        groupId
      }
    }
  `
}

export const groupCountQuery = () => {
  return gql`
    query ($isMember: Boolean) {
      GroupCount(isMember: $isMember)
    }
  `
}

export const groupTeaserQuery = (i18n) => {
  const lang = i18n ? i18n.locale().toUpperCase() : 'EN'
  return gql`
    ${location('Group', lang)}
    ${imageUrls}

    query ($id: ID!) {
      Group(id: $id) {
        id
        name
        slug
        about
        visibility
        actionRadius
        myGroupRole {
          name
          label
        }
        myGroupPermissions
        membersCount
        postsCount
        avatar {
          ...imageUrls
        }
        ...locationOnGroup
      }
    }
  `
}

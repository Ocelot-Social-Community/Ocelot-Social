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
      $groupType: GroupType!
      $actionRadius: GroupActionRadius!
      $categoryIds: [ID]
      $locationName: String # empty string '' sets it to null
    ) {
      CreateGroup(
        id: $id
        name: $name
        slug: $slug
        about: $about
        description: $description
        groupType: $groupType
        actionRadius: $actionRadius
        categoryIds: $categoryIds
        locationName: $locationName
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
      $actionRadius: GroupActionRadius
      $categoryIds: [ID]
      $avatar: ImageInput
      $locationName: String # empty string '' sets it to null
    ) {
      UpdateGroup(
        id: $id
        name: $name
        slug: $slug
        about: $about
        description: $description
        actionRadius: $actionRadius
        categoryIds: $categoryIds
        avatar: $avatar
        locationName: $locationName
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
        descriptionExcerpt
        groupType
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
        myRole
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

export const changeGroupMemberRoleMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!, $roleInGroup: GroupMemberRole!) {
      ChangeGroupMemberRole(groupId: $groupId, userId: $userId, roleInGroup: $roleInGroup) {
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
        descriptionExcerpt
        groupType
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
        ...location
        membersCount
        myRole
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

    query ($id: ID!, $first: Int, $offset: Int) {
      GroupMembers(id: $id, first: $first, offset: $offset) {
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

export const groupCountQuery = () => {
  return gql`
    query ($isMember: Boolean) {
      GroupCount(isMember: $isMember)
    }
  `
}

import gql from 'graphql-tag'
// import { locationFragment } from './Fragments'

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
          url
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
        id
        name
        slug
        myRoleInGroup
      }
    }
  `
}

export const leaveGroupMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!) {
      LeaveGroup(groupId: $groupId, userId: $userId) {
        id
        name
        slug
        myRoleInGroup
      }
    }
  `
}

export const changeGroupMemberRoleMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!, $roleInGroup: GroupMemberRole!) {
      ChangeGroupMemberRole(groupId: $groupId, userId: $userId, roleInGroup: $roleInGroup) {
        id
        name
        slug
        myRoleInGroup
      }
    }
  `
}

export const removeUserFromGroupMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!) {
      RemoveUserFromGroup(groupId: $groupId, userId: $userId) {
        id
        name
        slug
        myRoleInGroup
      }
    }
  `
}

// ------ queries

export const groupQuery = (i18n) => {
  const lang = i18n ? i18n.locale().toUpperCase() : 'EN'
  // ${locationFragment(lang)}
  return gql`

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
        categories {
          id
          slug
          name
          icon
        }
        avatar {
          url
        }
        locationName
        # ...location
        location {
          name: name${lang}
          lng
          lat
        }
        myRole
      }
    }
  `
}

export const groupMembersQuery = () => {
  return gql`
    query ($id: ID!) {
      GroupMembers(id: $id) {
        id
        name
        slug
        myRoleInGroup
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

import gql from 'graphql-tag'

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
        location {
          name
          nameDE
          nameEN
        }
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
        # avatar # test this as result
        locationName
        location {
          name
          nameDE
          nameEN
        }
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

export const groupQuery = () => {
  return gql`
    query ($isMember: Boolean, $id: ID, $slug: String) {
      Group(isMember: $isMember, id: $id, slug: $slug) {
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
        location {
          name
          nameDE
          nameEN
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

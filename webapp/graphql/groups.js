import gql from 'graphql-tag'

// ------ mutations

export const createGroupMutation = gql`
  mutation (
    $id: ID
    $name: String!
    $slug: String
    $about: String
    $description: String!
    $groupType: GroupType!
    $actionRadius: GroupActionRadius!
    $categoryIds: [ID]
    $locationName: String
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
      groupType
      actionRadius
      categories {
        id
        slug
        name
        icon
      }
      # locationName # test this as result
      myRole
    }
  }
`

export const updateGroupMutation = gql`
  mutation (
    $id: ID!
    $name: String
    $slug: String
    $about: String
    $description: String
    $actionRadius: GroupActionRadius
    $categoryIds: [ID]
    $avatar: ImageInput
    $locationName: String
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
      groupType
      actionRadius
      categories {
        id
        slug
        name
        icon
      }
      # avatar # test this as result
      # locationName # test this as result
      myRole
    }
  }
`

export const joinGroupMutation = gql`
  mutation ($groupId: ID!, $userId: ID!) {
    JoinGroup(groupId: $groupId, userId: $userId) {
      id
      name
      slug
      myRoleInGroup
    }
  }
`

export const changeGroupMemberRoleMutation = gql`
  mutation ($groupId: ID!, $userId: ID!, $roleInGroup: GroupMemberRole!) {
    ChangeGroupMemberRole(groupId: $groupId, userId: $userId, roleInGroup: $roleInGroup) {
      id
      name
      slug
      myRoleInGroup
    }
  }
`

// ------ queries

export const groupQuery = gql`
  query (
    $isMember: Boolean
    $id: ID
    $name: String
    $slug: String
    $createdAt: String
    $updatedAt: String
    $about: String
    $description: String
    $locationName: String
    $first: Int
    $offset: Int
    $orderBy: [_GroupOrdering]
    $filter: _GroupFilter
  ) {
    Group(
      isMember: $isMember
      id: $id
      name: $name
      slug: $slug
      createdAt: $createdAt
      updatedAt: $updatedAt
      about: $about
      description: $description
      locationName: $locationName
      first: $first
      offset: $offset
      orderBy: $orderBy
      filter: $filter
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
      # locationName # test this as result
      myRole
    }
  }
`

export const groupMembersQuery = gql`
  query ($id: ID!, $first: Int, $offset: Int, $orderBy: [_UserOrdering], $filter: _UserFilter) {
    GroupMembers(id: $id, first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
      id
      name
      slug
      myRoleInGroup
    }
  }
`

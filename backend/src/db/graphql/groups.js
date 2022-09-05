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
      myRole
      categories {
        id
        slug
        name
        icon
      }
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

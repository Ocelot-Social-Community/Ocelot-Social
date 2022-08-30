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

export const updateGroupMutation = gql`
  mutation (
    $id: ID!
    $name: String
    $slug: String
    $avatar: ImageInput
    $about: String
    $description: String
    $actionRadius: GroupActionRadius
    $categoryIds: [ID]
  ) {
    UpdateGroup(
      id: $id
      name: $name
      slug: $slug
      avatar: $avatar
      about: $about
      description: $description
      actionRadius: $actionRadius
      categoryIds: $categoryIds
    ) {
      id
      name
      slug
      avatar
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

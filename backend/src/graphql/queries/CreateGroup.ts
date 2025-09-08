import gql from 'graphql-tag'

export const CreateGroup = gql`
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

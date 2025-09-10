import gql from 'graphql-tag'

export const UpdateGroup = gql`
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

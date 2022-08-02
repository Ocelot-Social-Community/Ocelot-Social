import gql from 'graphql-tag'

export const createGroupMutation = gql`
  mutation (
    $id: ID,
    $name: String!,
    $slug: String,
    $about: String,
    $categoryIds: [ID]
  ) {
    CreateGroup(
      id: $id
      name: $name
      slug: $slug
      about: $about
      categoryIds: $categoryIds
    ) {
      id
      name
      slug
      about
      disabled
      deleted
      owner {
        name
      }
    }
  }
`

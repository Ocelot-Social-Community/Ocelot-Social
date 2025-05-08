import gql from 'graphql-tag'

export const Group = gql`
  query Group($isMember: Boolean, $id: ID, $slug: String) {
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

import gql from 'graphql-tag'

export const group = gql`
  fragment group on Group {
    id
    groupName: name
    slug
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
`

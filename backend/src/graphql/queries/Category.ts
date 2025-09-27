import gql from 'graphql-tag'

export const Category = gql`
  query {
    Category {
      id
      slug
      name
      icon
    }
  }
`

import gql from 'graphql-tag'

export const availableRoles = gql`
  query {
    availableRoles
  }
`

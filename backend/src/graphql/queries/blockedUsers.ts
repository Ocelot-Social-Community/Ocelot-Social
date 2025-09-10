import gql from 'graphql-tag'

export const blockedUsers = gql`
  query {
    blockedUsers {
      id
      name
      isBlocked
    }
  }
`

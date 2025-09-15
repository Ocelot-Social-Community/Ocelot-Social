import gql from 'graphql-tag'

export const mutedUsers = gql`
  query {
    mutedUsers {
      id
      name
      isMuted
    }
  }
`

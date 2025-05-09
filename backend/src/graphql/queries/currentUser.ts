import gql from 'graphql-tag'

export const currentUser = gql`
  query currentUser {
    currentUser {
      following {
        name
      }
      inviteCodes {
        code
        redeemedByCount
      }
    }
  }
`

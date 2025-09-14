import gql from 'graphql-tag'

export const currentUser = gql`
  query currentUser {
    currentUser {
      id
      slug
      name
      avatar {
        url
      }
      email
      role
      activeCategories
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

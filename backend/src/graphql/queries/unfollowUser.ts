import gql from 'graphql-tag'

export const unfollowUser = gql`
  mutation ($id: ID!) {
    unfollowUser(id: $id) {
      name
      followedBy {
        id
        name
      }
      followedByCurrentUser
    }
  }
`

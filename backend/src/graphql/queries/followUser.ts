import gql from 'graphql-tag'

export const followUser = gql`
  mutation ($id: ID!) {
    followUser(id: $id) {
      id
      name
      followedBy {
        id
        name
      }
      followedByCurrentUser
    }
  }
`

import gql from 'graphql-tag'

export const unmuteUser = gql`
  mutation ($id: ID!) {
    unmuteUser(id: $id) {
      id
      name
      isMuted
    }
  }
`

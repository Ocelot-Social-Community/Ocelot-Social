import gql from 'graphql-tag'

export const unblockUser = gql`
  mutation ($id: ID!) {
    unblockUser(id: $id) {
      id
      name
      isBlocked
    }
  }
`

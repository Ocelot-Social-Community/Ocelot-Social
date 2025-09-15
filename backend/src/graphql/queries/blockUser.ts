import gql from 'graphql-tag'

export const blockUser = gql`
  mutation ($id: ID!) {
    blockUser(id: $id) {
      id
      name
      isBlocked
    }
  }
`

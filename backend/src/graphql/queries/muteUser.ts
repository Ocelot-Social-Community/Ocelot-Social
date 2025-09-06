import gql from 'graphql-tag'

export const muteUser = gql`
  mutation ($id: ID!) {
    muteUser(id: $id) {
      id
      name
      isMuted
    }
  }
`

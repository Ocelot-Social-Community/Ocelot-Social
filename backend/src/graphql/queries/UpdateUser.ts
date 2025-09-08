import gql from 'graphql-tag'

export const UpdateUser = gql`
  mutation ($id: ID!, $name: String) {
    UpdateUser(id: $id, name: $name) {
      name
    }
  }
`

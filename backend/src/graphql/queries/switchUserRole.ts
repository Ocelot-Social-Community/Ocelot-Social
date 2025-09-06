import gql from 'graphql-tag'

export const switchUserRole = gql`
  mutation ($role: UserRole!, $id: ID!) {
    switchUserRole(role: $role, id: $id) {
      name
      role
      id
      updatedAt
      email
    }
  }
`

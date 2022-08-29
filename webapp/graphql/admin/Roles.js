import gql from 'graphql-tag'

export const FetchAllRoles = () => {
  return gql`
    query {
      availableRoles
    }
  `
}

export const updateUserRole = (role, id) => {
  return gql`
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
}

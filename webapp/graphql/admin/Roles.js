import gql from 'graphql-tag'

export const FetchAllRoles = () => {
  return gql`
    query {
      __type(name: "UserGroup") {
        name
        enumValues {
          name
        }
      }
    }
  `
}

export const updateUserRole = (role, id) => {
  return gql`
    mutation($role: UserGroup!, $id: ID!) {
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

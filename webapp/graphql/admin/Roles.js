import gql from 'graphql-tag'

export const FetchAllRoles = gql`
  query {
    __type(name: "UserGroup") {
      name
      enumValues {
        name
      }
    }
  }
`

export const updateUserRole = (role, id) => {
  return gql`
        mutation {
            switchUserRole(role: ${role}, id: "${id}" ) {
                name
                role
                id
                updatedAt
                email
            }
        }`
}

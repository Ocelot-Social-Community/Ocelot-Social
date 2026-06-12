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

// --- Dynamic roles & permissions (RBAC) ------------------------------------

export const permissionCatalogQuery = gql`
  query {
    permissionCatalog {
      key
      group
      description
    }
  }
`

export const rolesQuery = gql`
  query {
    roles {
      name
      protected
      permissions
      memberCount
    }
  }
`

export const userRolesQuery = gql`
  query ($userId: ID!) {
    userRoles(userId: $userId) {
      name
    }
  }
`

export const createRoleMutation = gql`
  mutation ($name: String!, $permissions: [String!]!) {
    createRole(name: $name, permissions: $permissions) {
      name
      protected
      permissions
      memberCount
    }
  }
`

export const updateRoleMutation = gql`
  mutation ($name: String!, $permissions: [String!]!) {
    updateRole(name: $name, permissions: $permissions) {
      name
      protected
      permissions
      memberCount
    }
  }
`

export const deleteRoleMutation = gql`
  mutation ($name: String!) {
    deleteRole(name: $name)
  }
`

export const setUserRoleMutation = gql`
  mutation ($userId: ID!, $roleName: String!) {
    setUserRole(userId: $userId, roleName: $roleName) {
      id
      role
      roleName
    }
  }
`

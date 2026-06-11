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
      description
      rank
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
      rank
    }
  }
`

export const createRoleMutation = gql`
  mutation ($name: String!, $description: String, $rank: Int!, $permissions: [String!]!) {
    createRole(name: $name, description: $description, rank: $rank, permissions: $permissions) {
      name
      description
      rank
      protected
      permissions
      memberCount
    }
  }
`

export const updateRoleMutation = gql`
  mutation ($name: String!, $description: String, $rank: Int!, $permissions: [String!]!) {
    updateRole(name: $name, description: $description, rank: $rank, permissions: $permissions) {
      name
      description
      rank
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

export const assignRoleMutation = gql`
  mutation ($userId: ID!, $roleName: String!) {
    assignRole(userId: $userId, roleName: $roleName) {
      id
    }
  }
`

export const unassignRoleMutation = gql`
  mutation ($userId: ID!, $roleName: String!) {
    unassignRole(userId: $userId, roleName: $roleName) {
      id
    }
  }
`

import gql from 'graphql-tag'

// Lean signal that effective permissions may have changed (a role's permission set or
// a user's role assignment). The client refetches its own myPermissions on receipt;
// the payload carries only the affected role name (no actor). `previousRoleName` is set
// only on a rename, so the admin roles view can follow its selection to the new name.
export default () => gql`
  subscription permissionsChanged {
    permissionsChanged {
      roleName
      previousRoleName
    }
  }
`

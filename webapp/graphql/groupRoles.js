import gql from 'graphql-tag'

// The group rights UI needs three things: the catalog (what can be granted at all), the
// group's own role definitions, and what the viewer holds — because a group may never grant
// a role more than the person editing it holds themselves.
export const groupRightsQuery = () => gql`
  query ($id: ID!) {
    # Every template a group can be put on, with what it makes the group. The permission SETS
    # stay behind group.roleTemplate.manage — this is the vocabulary, not the contents.
    groupTemplates {
      name
      visibility
    }
    groupPermissionCatalog {
      key
      group
      description
      gatedBy
      requiresNetworkPermission
    }
    Group(id: $id) {
      id
      slug
      name
      visibility
      myGroupPermissions
      roles {
        name
        label
        system
        protected
        permissions
        memberCount
      }
    }
  }
`

export const updateGroupRoleMutation = () => gql`
  mutation ($groupId: ID!, $name: String!, $permissions: [String!]!, $label: String) {
    updateGroupRole(groupId: $groupId, name: $name, permissions: $permissions, label: $label) {
      name
      label
      system
      protected
      permissions
      memberCount
    }
  }
`

export const createGroupRoleMutation = () => gql`
  mutation ($groupId: ID!, $name: String!, $permissions: [String!]!, $label: String) {
    createGroupRole(groupId: $groupId, name: $name, permissions: $permissions, label: $label) {
      name
      label
      system
      protected
      permissions
      memberCount
    }
  }
`

export const renameGroupRoleMutation = () => gql`
  mutation ($groupId: ID!, $name: String!, $newName: String!) {
    renameGroupRole(groupId: $groupId, name: $name, newName: $newName) {
      name
      label
      system
      protected
      permissions
      memberCount
    }
  }
`

export const deleteGroupRoleMutation = () => gql`
  mutation ($groupId: ID!, $name: String!, $reassignTo: String!) {
    deleteGroupRole(groupId: $groupId, name: $name, reassignTo: $reassignTo)
  }
`

export const resetGroupRolesMutation = () => gql`
  mutation ($groupId: ID!, $template: String) {
    resetGroupRoles(groupId: $groupId, template: $template) {
      name
      label
      system
      protected
      permissions
      memberCount
    }
  }
`

export const setGroupMemberRoleMutation = () => gql`
  mutation ($groupId: ID!, $userId: ID!, $roleName: String!) {
    setGroupMemberRole(groupId: $groupId, userId: $userId, roleName: $roleName) {
      user {
        id
      }
      membership {
        role
      }
    }
  }
`

export const groupPermissionsChangedSubscription = () => gql`
  subscription ($groupId: ID!) {
    groupPermissionsChanged(groupId: $groupId) {
      groupId
    }
  }
`

export const removePostFromGroupMutation = () => gql`
  mutation ($groupId: ID!, $postId: ID!) {
    removePostFromGroup(groupId: $groupId, postId: $postId) {
      id
    }
  }
`

/**
 * Pick up the network rights one holds over a group — the deliberate half of holding them.
 * Without it those rights give reading and nothing else (backend: groupRole/elevation.ts).
 */
export const elevateInGroupMutation = () => gql`
  mutation ($groupId: ID!, $reason: String) {
    elevateInGroup(groupId: $groupId, reason: $reason) {
      groupId
      expiresAt
      reason
    }
  }
`

export const endGroupElevationMutation = () => gql`
  mutation ($groupId: ID!) {
    endGroupElevation(groupId: $groupId)
  }
`

/**
 * The templates a group can be created from, with what each one makes the group.
 *
 * The visibility travels with the name because `group.create_<visibility>` is checked against
 * it, and the two are not the same string: a `channel` is a public group, so making one costs
 * `group.create_public`.
 */
export const groupTemplatesQuery = () => gql`
  query {
    groupTemplates {
      name
      visibility
    }
  }
`

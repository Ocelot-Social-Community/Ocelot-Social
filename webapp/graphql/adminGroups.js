import gql from 'graphql-tag'

// The admin group list: the only way to reach a hidden group, and the only place a group left
// without an owner can be found. Restricted server-side to the group types the viewer holds
// `group.administer.any_<type>` for.
export const adminGroupsQuery = () => gql`
  query (
    $search: String
    $groupType: GroupType
    $ownerless: Boolean
    $disabled: Boolean
    $first: Int
    $offset: Int
  ) {
    adminGroups(
      search: $search
      groupType: $groupType
      ownerless: $ownerless
      disabled: $disabled
      first: $first
      offset: $offset
    ) {
      id
      slug
      name
      groupType
      disabled
      createdAt
      membersCount
      ownerCount
    }
    adminGroupCount(
      search: $search
      groupType: $groupType
      ownerless: $ownerless
      disabled: $disabled
    )
  }
`

export const groupRoleTemplatesQuery = () => gql`
  query {
    groupPermissionCatalog {
      key
      group
      description
      gatedBy
      requiresNetworkPermission
    }
    groupRoleTemplates {
      groupType
      untouchedGroupCount
      roles {
        name
        label
        system
        protected
        permissions
      }
    }
  }
`

export const updateGroupRoleTemplateMutation = () => gql`
  mutation ($groupType: String!, $name: String!, $permissions: [String!]!, $label: String) {
    updateGroupRoleTemplate(
      groupType: $groupType
      name: $name
      permissions: $permissions
      label: $label
    ) {
      name
      label
      system
      protected
      permissions
    }
  }
`

export const applyGroupRoleTemplatesMutation = () => gql`
  mutation {
    applyGroupRoleTemplates
  }
`

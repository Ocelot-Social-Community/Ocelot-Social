import gql from 'graphql-tag'

// The admin group list: the only way to reach a hidden group, and the only place a group left
// without an owner can be found. Restricted server-side to the group types the viewer holds
// `group.administer.any_<type>` for.
export const adminGroupsQuery = () => gql`
  query (
    $search: String
    $visibility: GroupVisibility
    $ownerless: Boolean
    $disabled: Boolean
    $first: Int
    $offset: Int
  ) {
    adminGroups(
      search: $search
      visibility: $visibility
      ownerless: $ownerless
      disabled: $disabled
      first: $first
      offset: $offset
    ) {
      id
      slug
      name
      visibility
      disabled
      createdAt
      membersCount
      ownerCount
    }
    adminGroupCount(
      search: $search
      visibility: $visibility
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
      name
      visibility
      untouchedGroupCount
      groupCount
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
  mutation ($template: String!, $name: String!, $permissions: [String!]!, $label: String) {
    updateGroupRoleTemplate(
      template: $template
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

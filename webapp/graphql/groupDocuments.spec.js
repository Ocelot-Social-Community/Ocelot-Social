import {
  adminGroupsQuery,
  applyGroupRoleTemplatesMutation,
  groupRoleTemplatesQuery,
  updateGroupRoleTemplateMutation,
} from './adminGroups'
import {
  createGroupRoleMutation,
  deleteGroupRoleMutation,
  groupPermissionsChangedSubscription,
  groupRightsQuery,
  removePostFromGroupMutation,
  renameGroupRoleMutation,
  resetGroupRolesMutation,
  setGroupMemberRoleMutation,
  updateGroupRoleMutation,
} from './groupRoles'

// The documents are built by gql`` at call time, so a malformed one throws here rather than at
// the first render that happens to use it. Each is also checked for the operation it claims to
// be, because a query that says `mutation` sails past the parser and fails against the server.
describe('group rights documents', () => {
  const documents = [
    ['adminGroupsQuery', adminGroupsQuery, 'query'],
    ['groupRoleTemplatesQuery', groupRoleTemplatesQuery, 'query'],
    ['updateGroupRoleTemplateMutation', updateGroupRoleTemplateMutation, 'mutation'],
    ['applyGroupRoleTemplatesMutation', applyGroupRoleTemplatesMutation, 'mutation'],
    ['groupRightsQuery', groupRightsQuery, 'query'],
    ['updateGroupRoleMutation', updateGroupRoleMutation, 'mutation'],
    ['createGroupRoleMutation', createGroupRoleMutation, 'mutation'],
    ['renameGroupRoleMutation', renameGroupRoleMutation, 'mutation'],
    ['deleteGroupRoleMutation', deleteGroupRoleMutation, 'mutation'],
    ['resetGroupRolesMutation', resetGroupRolesMutation, 'mutation'],
    ['setGroupMemberRoleMutation', setGroupMemberRoleMutation, 'mutation'],
    ['removePostFromGroupMutation', removePostFromGroupMutation, 'mutation'],
    ['groupPermissionsChangedSubscription', groupPermissionsChangedSubscription, 'subscription'],
  ]

  it.each(documents)('%s parses as a %s', (_name, build, operation) => {
    const document = build()

    expect(document.kind).toBe('Document')
    const definition = document.definitions.find((d) => d.kind === 'OperationDefinition')
    expect(definition.operation).toBe(operation)
  })

  it('asks the admin group list for what the page renders', () => {
    // The list shows the owner count and the member count; without them a group left without an
    // owner would be indistinguishable from any other.
    const printed = JSON.stringify(adminGroupsQuery())

    expect(printed).toContain('ownerCount')
    expect(printed).toContain('membersCount')
    expect(printed).toContain('adminGroupCount')
  })

  it('asks the rights page for the catalog AND what the viewer holds', () => {
    // Without myGroupPermissions the page could not tell which rights it may offer at all.
    const printed = JSON.stringify(groupRightsQuery())

    expect(printed).toContain('groupPermissionCatalog')
    expect(printed).toContain('myGroupPermissions')
    expect(printed).toContain('requiresNetworkPermission')
  })
})

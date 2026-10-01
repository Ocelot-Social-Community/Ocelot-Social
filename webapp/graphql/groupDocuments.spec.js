import {
  adminGroupsQuery,
  applyGroupRoleTemplatesMutation,
  groupRoleTemplatesQuery,
  updateGroupRoleTemplateMutation,
} from './adminGroups'
import { post } from './fragments/post'
import { groupQuery } from './groups'
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

  it('carries the group rights on every post, for the content menu', () => {
    // The group pin and "take out of group" entries ask canInGroup() against post.group, and a
    // group object WITHOUT myGroupPermissions answers no to everything — so leaving the field
    // out of this fragment switched both entries off everywhere without any test noticing.
    const printed = JSON.stringify(post)

    expect(printed).toContain('myGroupPermissions')
    expect(printed).toContain('myGroupRole')
  })

  it('no longer asks for the deprecated myRole anywhere', () => {
    // Group roles are group-defined, so the enum field cannot express them. Everything reads
    // myGroupRole / myGroupPermissions now; this guards the documents against it creeping back.
    for (const document of [post, groupQuery(), groupRightsQuery()]) {
      expect(JSON.stringify(document)).not.toContain('"myRole"')
    }
  })

  it('asks the rights page for the catalog AND what the viewer holds', () => {
    // Without myGroupPermissions the page could not tell which rights it may offer at all.
    const printed = JSON.stringify(groupRightsQuery())

    expect(printed).toContain('groupPermissionCatalog')
    expect(printed).toContain('myGroupPermissions')
    expect(printed).toContain('requiresNetworkPermission')
  })
})

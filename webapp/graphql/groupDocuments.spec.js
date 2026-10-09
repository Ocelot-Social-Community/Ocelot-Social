import { adminGroupsQuery } from './adminGroups'
import { post } from './fragments/post'
import { groupQuery } from './groups'
import { groupRightsQuery } from './groupRoles'

// What these documents SELECT, not that they parse — the parse is the pages' own problem and
// every page spec that mounts one proves it. A field quietly missing from a selection is the
// failure no render catches: the UI simply decides it may do nothing.
describe('group rights documents', () => {
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

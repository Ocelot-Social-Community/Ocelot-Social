import { GROUP_PERMISSIONS, NETWORK_PERMISSIONS, permissionLabel } from './permissionLabel'

describe('permissionLabel', () => {
  const permission = { key: 'group.comment.create', description: 'Comment on posts in the group.' }

  it('looks the right up by its flattened key in the given namespace', () => {
    const $t = (path) => `T:${path}`
    expect(permissionLabel($t, GROUP_PERMISSIONS, permission)).toBe(
      'T:group.rights.perm.group_comment_create',
    )
    expect(permissionLabel($t, NETWORK_PERMISSIONS, permission)).toBe(
      'T:admin.roles.perm.group_comment_create',
    )
  })

  // vuex-i18n answers a missing key with the key itself.
  it('falls back to the catalog description when there is no translation', () => {
    const $t = (path) => path
    expect(permissionLabel($t, GROUP_PERMISSIONS, permission)).toBe(
      'Comment on posts in the group.',
    )
  })

  it('falls back when the translation is empty', () => {
    expect(permissionLabel(() => '', GROUP_PERMISSIONS, permission)).toBe(
      'Comment on posts in the group.',
    )
  })
})

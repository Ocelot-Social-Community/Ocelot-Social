/**
 * Group rights for a test fixture, by seeded role name.
 *
 * Specs used to write `myRole: 'owner'` and the component compared strings. Now a component
 * asks what the viewer may do, so a fixture has to carry that instead — this keeps the sets in
 * one place rather than spelling them out in every spec.
 */
const MEMBER = [
  'group.read',
  'group.content.read',
  'group.members.read',
  'group.post.create',
  'group.comment.create',
  'group.leave',
  'group.chat.participate',
  'group.videoCall.join',
  'group.videoCall.create',
]

const ADMIN = [
  ...MEMBER,
  'group.post.pin',
  'group.member.approve',
  'group.member.remove',
  'group.member.role.assign',
  'group.settings.manage',
  'group.invite',
  'group.invite.external',
]

const OWNER = [...ADMIN, 'group.type.change', 'group.role.manage']

const PERMISSIONS = {
  none: ['group.read', 'group.content.read', 'group.members.read', 'group.join'],
  pending: ['group.read', 'group.leave'],
  usual: MEMBER,
  admin: ADMIN,
  owner: OWNER,
}

/** `{ myGroupRole, myGroupPermissions }` for a role name, or for a non-member with null. */
export const groupRights = (roleName) => ({
  myGroupRole: roleName ? { name: roleName, label: null } : null,
  myGroupPermissions: roleName ? PERMISSIONS[roleName] : PERMISSIONS.none,
})

export default groupRights

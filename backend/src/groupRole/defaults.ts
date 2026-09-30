import { ADMIN_ROLE, NONE_ROLE, OWNER_ROLE, PENDING_ROLE, USUAL_ROLE } from './types'

import type { GroupRoleDefinition, GroupRoleTemplates } from './types'
import type { GroupPermissionKey } from '@src/groupPermission'

// The seeded default group roles, per group type.
//
// These sets are an AUDIT of the hand-written shield guards they replace, so a group
// upgrading to this model keeps exactly the behaviour it had — the same discipline
// role/defaults.ts applies to the network roles. The four deliberate deviations are
// marked below; everything else is today's behaviour written down as data.
//
// Per group TYPE rather than one set plus a `none` variant: `usual` differs too (inviting
// is open to members in a public group and admin-only in a closed one), and "the defaults
// of a closed group" is how an operator thinks about it anyway.
//
// `owner` stores no permissions: it resolves to the full catalog
// (permissionsForGroupRole), so a newly added key is owned automatically and an owner can
// never be locked out of their own group.

// What a member may do in any group type.
const MEMBER_BASELINE: GroupPermissionKey[] = [
  'group.read',
  'group.content.read',
  'group.members.read',
  'group.post.create',
  'group.comment.create',
  'group.leave',
  // DEVIATION (security fix): CreateGroupRoom / CreateMessage / joinGroupVideoCall are
  // gated by `isAuthenticated` alone today, i.e. not bound to membership at all. Chat and
  // calls become members-only, which is what everyone already assumes they are.
  'group.chat.participate',
  'group.videoCall.join',
  // Capped by the network's videoCall.create_<type>, whose default only covers public
  // groups — so this stays parity with today's public-only implementation.
  'group.videoCall.create',
]

// What an admin adds on top of a member.
const ADMIN_EXTRAS: GroupPermissionKey[] = [
  'group.post.pin',
  'group.member.approve',
  'group.member.remove',
  'group.member.role.assign',
  // DEVIATION: owner-only today, although the schema doc claims admins may change
  // settings and admins can already assign roles. #8537 asks for exactly this.
  'group.settings.manage',
  'group.invite',
  // Inviting someone who is not on the network yet is the stronger of the two invite
  // rights (it can lead to a registration), so it stays with admins in every group type.
  'group.invite.external',
]

// An applicant sees that the group exists and can withdraw. Nothing else: `pending` is
// deliberately not a member (isActiveMembershipRole).
const PENDING_PERMISSIONS: GroupPermissionKey[] = ['group.read', 'group.leave']

const systemRole = (name: string, permissions: GroupPermissionKey[]): GroupRoleDefinition => ({
  name,
  label: null,
  system: true,
  protected: false,
  permissions,
})

const ownerRole = (): GroupRoleDefinition => ({
  name: OWNER_ROLE,
  label: null,
  system: true,
  protected: true,
  permissions: [],
})

const editableRole = (name: string, permissions: GroupPermissionKey[]): GroupRoleDefinition => ({
  name,
  label: null,
  system: false,
  protected: false,
  permissions,
})

export const DEFAULT_GROUP_ROLE_TEMPLATES: GroupRoleTemplates = {
  // Anyone may read and join without approval.
  public: [
    systemRole(NONE_ROLE, ['group.read', 'group.content.read', 'group.members.read', 'group.join']),
    systemRole(PENDING_ROLE, PENDING_PERMISSIONS),
    // Members of a public group may bring others in; the intent of today's (broken)
    // invite guard.
    editableRole(USUAL_ROLE, [...MEMBER_BASELINE, 'group.invite']),
    // group.invite is already part of ADMIN_EXTRAS — an admin holds it in every group type.
    editableRole(ADMIN_ROLE, [...MEMBER_BASELINE, ...ADMIN_EXTRAS]),
    ownerRole(),
  ],
  // Findable, but joining needs approval — so a non-member may ask, not enter. Whether
  // they may see the member list is what the `showMembers` setting decides; the
  // migration writes group.members.read into this role for groups that had it on.
  closed: [
    systemRole(NONE_ROLE, ['group.read', 'group.join.request']),
    systemRole(PENDING_ROLE, PENDING_PERMISSIONS),
    editableRole(USUAL_ROLE, [...MEMBER_BASELINE]),
    editableRole(ADMIN_ROLE, [...MEMBER_BASELINE, ...ADMIN_EXTRAS]),
    ownerRole(),
  ],
  // Unlisted: a non-member has no rights at all, which is what makes joining a hidden
  // group structurally impossible rather than a special case in the join guard (#8398).
  hidden: [
    systemRole(NONE_ROLE, []),
    systemRole(PENDING_ROLE, PENDING_PERMISSIONS),
    editableRole(USUAL_ROLE, [...MEMBER_BASELINE]),
    editableRole(ADMIN_ROLE, [...MEMBER_BASELINE, ...ADMIN_EXTRAS]),
    ownerRole(),
  ],
}

// The role names every group must always have, whatever an operator did to the
// templates: the three system roles plus the two seeded editable ones are re-ensured on
// seeding, and the system ones can never be removed afterwards.
export const MANDATORY_GROUP_ROLE_NAMES: readonly string[] = [NONE_ROLE, PENDING_ROLE, OWNER_ROLE]

export function defaultTemplateFor(groupType: string): GroupRoleDefinition[] | undefined {
  // eslint-disable-next-line security/detect-object-injection -- groupType is validated against the GroupType enum before it reaches here
  const template = DEFAULT_GROUP_ROLE_TEMPLATES[groupType]
  return template
    ? template.map((role) => ({ ...role, permissions: [...role.permissions] }))
    : undefined
}

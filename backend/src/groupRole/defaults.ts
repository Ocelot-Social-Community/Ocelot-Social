import { ADMIN_ROLE, NONE_ROLE, OWNER_ROLE, PENDING_ROLE, USUAL_ROLE } from './types'

import type { GroupRoleDefinition, GroupRoleTemplates } from './types'
import type { GroupPermissionKey } from '@src/groupPermission'

// The seeded default group roles, per visibility.
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

// What a member may do in any visibility.
const MEMBER_BASELINE: GroupPermissionKey[] = [
  'group.read',
  'group.content.read',
  'group.members.read',
  'group.post.create',
  'group.comment.create',
  'group.leave',
  // Chat and calls ARE members-only today — but the check lives in three different places:
  // CreateGroupRoom filters on `membership.role IN [...]` in its own Cypher,
  // joinGroupVideoCall throws from getGroupMembershipType, and CreateMessage relies on the
  // CHATS_IN edge that only active members get. Here they become one right, checked in the
  // one place the shield looks.
  'group.chat.participate',
  'group.videoCall.join',
  // Capped by the network's videoCall.create_<type>, whose default only covers public
  // groups — so this stays parity with today's public-only implementation.
  'group.videoCall.create',
]

// What an admin adds on top of a member.
const ADMIN_EXTRAS: GroupPermissionKey[] = [
  'group.post.pin',
  // Taking a post out of the group. Not deleting it: it stays with its author, which is why
  // this is a group right and not a moderation right about the post itself.
  'group.post.moderate',
  'group.member.remove',
  'group.member.role.assign',
  // DEVIATION: owner-only today, although the schema doc claims admins may change
  // settings and admins can already assign roles. #8537 asks for exactly this.
  'group.settings.manage',
  'group.invite',
  // Inviting someone who is not on the network yet is the stronger of the two invite
  // rights (it can lead to a registration), so it stays with admins in every visibility.
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

export const DEFAULT_GROUP_ROLE_TEMPLATES: GroupRoleTemplates = {
  // Anyone may read and join without approval.
  public: [
    systemRole(NONE_ROLE, ['group.read', 'group.content.read', 'group.members.read', 'group.join']),
    systemRole(PENDING_ROLE, PENDING_PERMISSIONS),
    // Members of a public group may bring others in; the intent of today's (broken)
    // invite guard.
    systemRole(USUAL_ROLE, [...MEMBER_BASELINE, 'group.invite']),
    // group.invite is already part of ADMIN_EXTRAS — an admin holds it in every visibility.
    systemRole(ADMIN_ROLE, [...MEMBER_BASELINE, ...ADMIN_EXTRAS]),
    ownerRole(),
  ],
  // Findable, but joining needs approval — so a non-member may ask, not enter. Whether
  // they may see the member list is what the `showMembers` setting decides; the
  // migration writes group.members.read into this role for groups that had it on.
  closed: [
    systemRole(NONE_ROLE, ['group.read', 'group.join.request']),
    systemRole(PENDING_ROLE, PENDING_PERMISSIONS),
    systemRole(USUAL_ROLE, [...MEMBER_BASELINE]),
    systemRole(ADMIN_ROLE, [...MEMBER_BASELINE, ...ADMIN_EXTRAS]),
    ownerRole(),
  ],
  // Unlisted: a non-member has no rights at all, which is what makes joining a hidden
  // group structurally impossible rather than a special case in the join guard (#8398).
  hidden: [
    systemRole(NONE_ROLE, []),
    // An applicant does not see a hidden group either — `group.read` is deliberately absent
    // here, where the other two types grant it. That is the guard this replaces:
    // `visibility = 'hidden' AND membership.role <> 'pending'` (as it then was), i.e. invisible
    // is not actually a member. Withdrawing still works, because leaving needs no reading.
    //
    // It leaves one dead end, which is a product question rather than a bug in this file: an
    // invitation to an unlisted group lands the invitee as `pending` (redeemInviteCode reads
    // `group.join`, which the non-member role here does not grant), and they then hold nothing
    // but the right to leave something they cannot see.
    systemRole(PENDING_ROLE, ['group.leave']),
    systemRole(USUAL_ROLE, [...MEMBER_BASELINE]),
    systemRole(ADMIN_ROLE, [...MEMBER_BASELINE, ...ADMIN_EXTRAS]),
    ownerRole(),
  ],
  // A channel: everybody may read and join, only the people running it write. The first
  // template that is NOT named after the visibility it produces — it produces `public`, same as
  // the one above, and what distinguishes the two is in the member role rather than in the
  // non-member one. That is the point of it being a template: "turn this into a channel" used
  // to be a button that silently took two rights off `usual`, which is a thing one can neither
  // see beforehand nor recognise afterwards.
  channel: [
    systemRole(NONE_ROLE, ['group.read', 'group.content.read', 'group.members.read', 'group.join']),
    systemRole(PENDING_ROLE, PENDING_PERMISSIONS),
    // Posting is what a channel withholds — COMMENTING is not. A channel where nobody may
    // answer is a broadcast, and that is a different product; whether somebody who is not a
    // member may comment is a further question this template does not answer.
    systemRole(USUAL_ROLE, MEMBER_BASELINE.filter((key) => key !== 'group.post.create')),
    systemRole(ADMIN_ROLE, [...MEMBER_BASELINE, ...ADMIN_EXTRAS]),
    ownerRole(),
  ],
}

// The role names every group must always have, whatever an operator did to the templates.
// They are exactly the system roles: no membership without a destination (`usual`), no
// application without a waiting room (`pending`), no group without a non-member view (`none`),
// none without somebody to run it (`admin`) and none without a failsafe (`owner`).
//
// `admin` joined this list with #10356: it used to be an ordinary role a group could delete,
// which was defensible only while the group could also create roles of its own. With that
// parked, a group that had deleted its admin role would have had no way back to one.
export const MANDATORY_GROUP_ROLE_NAMES: readonly string[] = [
  NONE_ROLE,
  PENDING_ROLE,
  USUAL_ROLE,
  ADMIN_ROLE,
  OWNER_ROLE,
]

// A Map rather than dynamic indexing into the record: the name arrives from a request, and a
// lookup that cannot be a prototype key needs no reasoning about whether it is safe.
const templatesByGroupType = new Map(Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES))

/**
 * A fresh copy of the template for this visibility, or undefined when the type has none —
 * which the drift guard in ./defaults.spec.ts makes unreachable for the types the schema
 * offers. Copies, so seeding one group can never mutate the shared template.
 */
export function defaultTemplateFor(template: string): GroupRoleDefinition[] | undefined {
  return templatesByGroupType
    .get(template)
    ?.map((role) => ({ ...role, permissions: [...role.permissions] }))
}

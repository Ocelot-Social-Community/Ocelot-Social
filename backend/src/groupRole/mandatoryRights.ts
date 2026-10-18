// What a role's permission list must and must not contain, whatever an editor ticks.
//
// Three rules, all of them about rights whose presence or absence would mean nothing or
// something false, rather than about who may grant what (that is the coverage check).
//
// **Mandatory.** `group.leave` on every role that IS a membership, because of what its absence
// would mean: a membership nobody can end. The other door out of a group is
// `group.member.remove`, which somebody ELSE has to hold and use — so a group whose admins are
// gone, or simply unwilling, would keep its members in it. That is a trap rather than a setting:
//
//   - a membership is a public association (the member list, the feeds, the notifications),
//     and an association one cannot dissolve is the opposite of what a leave button is for;
//   - the code already refused to believe in it: the per-request authorization hands a member
//     `group.leave` back when their role definition is missing (groupRole/requestScope.ts),
//     precisely so a damaged row cannot produce a group its members cannot get out of.
//
// **Moot.** A right that cannot apply to the role it sits on. `group.leave` on `none`, which is
// not a membership — there is nothing to leave; the chat rights on `none` likewise, since the
// room is entered through the membership. And the two JOIN rights on anything that IS a
// membership: somebody who holds a membership role has already joined, and on `pending` a join
// right would read as "an applicant may admit themselves", which is the one thing approval
// exists to prevent. Admitting an applicant is `group.member.role.assign`, held by somebody
// else.
//
// **Implied.** Reading the content or the member list of a group one may not even see is not a
// state the product has: every read path that answers for content first asks whether the group
// itself is readable, and the visibility is derived from `group.read` before anything else
// (./privacyLevel.ts). Granted apart, the stricter right silently wins and the editor is left
// with a ticked box that does nothing — which is exactly what the simple view produced: every
// switch ticked, and the group still reported as hidden.
import { isActiveMembershipRole, NONE_ROLE } from './types'

import type { GroupPermissionKey } from '@src/groupPermission'

/** Rights every role that IS a membership holds, whatever an editor ticks. */
export const MANDATORY_MEMBERSHIP_RIGHTS: readonly GroupPermissionKey[] = ['group.leave']

/** Rights that only mean something for somebody who is NOT in the group yet. */
export const NON_MEMBER_ONLY_RIGHTS: readonly GroupPermissionKey[] = [
  'group.join',
  'group.join.request',
]

/**
 * Rights that only mean something INSIDE the group: the chat. Its room is entered through the
 * membership (the CHATS_IN edge follows it, see syncGroupChatRoom), so on the non-member role
 * these would be a ticked box that opens nothing — and, through the floor that role sets for
 * everybody, one that would quietly hand the chat to every member as well.
 */
export const MEMBER_ONLY_RIGHTS: readonly GroupPermissionKey[] = [
  'group.chat.read',
  'group.chat.write',
]

/** What each right drags in with it, because it cannot be exercised without it. */
const IMPLIED_BY: ReadonlyMap<GroupPermissionKey, readonly GroupPermissionKey[]> = new Map([
  ['group.content.read', ['group.read'] as const],
  ['group.members.read', ['group.read'] as const],
  // Writing into a conversation one cannot read is not a state the chat has.
  ['group.chat.write', ['group.chat.read'] as const],
])

/** Whether this right is one the role in question may not be written without. */
export function isMandatoryFor(roleName: string, permission: GroupPermissionKey): boolean {
  return roleName !== NONE_ROLE && MANDATORY_MEMBERSHIP_RIGHTS.includes(permission)
}

/**
 * Whether the right means anything for this role at all.
 *
 * The matrices show such a right greyed, and where it is mandatory ticked-and-locked, so the
 * one place says both — a checkbox that changes nothing is worse than one that is absent.
 */
export function isMootFor(roleName: string, permission: GroupPermissionKey): boolean {
  if (roleName === NONE_ROLE) {
    return (
      MANDATORY_MEMBERSHIP_RIGHTS.includes(permission) || MEMBER_ONLY_RIGHTS.includes(permission)
    )
  }
  return NON_MEMBER_ONLY_RIGHTS.includes(permission)
}

/**
 * The rights an ask really contains: whatever was ticked, plus what those ticks cannot be
 * exercised without.
 *
 * Applied BEFORE the coverage check and the privacy cap, unlike the role-model rights below:
 * this is part of what the editor is asking for, so they should be held to it — and the
 * visibility the cap judges has to be the one that will actually be stored, or an edit that
 * ends up public is refused for making the group private.
 */
export function withImpliedRights(
  permissions: readonly GroupPermissionKey[],
): GroupPermissionKey[] {
  const held = new Set(permissions)
  for (const permission of permissions) {
    for (const implied of IMPLIED_BY.get(permission) ?? []) {
      held.add(implied)
    }
  }
  return [...held]
}

/**
 * The permission list as it must be STORED: the ask, plus the rights that role cannot be
 * without, minus the ones that cannot apply to it.
 *
 * Applied where roles are written rather than where they are read, so the stored list says what
 * is true instead of being corrected on every lookup — and AFTER the checks, because these
 * rights are imposed by the model rather than granted by the editor. Asking somebody to hold
 * `group.leave` themselves would refuse an edit over a right nobody chose.
 */
export function storableRightsFor(
  roleName: string,
  permissions: readonly GroupPermissionKey[],
): GroupPermissionKey[] {
  const held = new Set(permissions)
  for (const permission of MANDATORY_MEMBERSHIP_RIGHTS) {
    if (isMandatoryFor(roleName, permission)) {
      held.add(permission)
    }
  }
  for (const permission of [...held]) {
    if (isMootFor(roleName, permission)) {
      held.delete(permission)
    }
  }
  // A door into a group nobody outside can find. Entering and asking to enter both begin with
  // seeing that the group is there — so without `group.read` on the non-member role these two
  // are not a stricter setting, they are no setting at all, and an unlisted group is reached by
  // invitation or not at all (redeemInviteCode does not consult them).
  //
  // Dropped rather than made to imply `group.read`: implying it would turn a secret group
  // visible as a side effect of touching its door, which is the one thing a group that chose to
  // be unlisted must not have happen to it.
  if (roleName === NONE_ROLE && !held.has('group.read')) {
    for (const permission of NON_MEMBER_ONLY_RIGHTS) {
      held.delete(permission)
    }
  }
  return [...held]
}

/**
 * What a role inherits from the NON-MEMBER role, because that role is the group's floor.
 *
 * Whatever `none` grants, the group grants to everybody — so nobody inside it can hold less
 * than a stranger. Without this, an applicant to an open group was worse off for having asked:
 * the seeded `pending` role carries `group.read` and `group.leave`, while `none` in a public
 * group carries the content and the member list as well. Measured on a live instance, not
 * imagined.
 *
 * Computed rather than stored: the floor follows the non-member role, so a group that opens or
 * closes its door moves everybody with it and no row has to be rewritten.
 *
 * The two join rights are where the floor stops, and they stop at different roles:
 *
 *   - `group.join.request` is spent for anybody who already has an edge — they have asked, or
 *     they are in;
 *   - `group.join` is spent only for an ACTIVE membership. An applicant is deliberately not one
 *     (`isActiveMembershipRole`), and inheriting it is the whole point: the door the group holds
 *     open for strangers is open for them too, so they can walk in themselves instead of
 *     waiting for an approval nobody needs any more.
 */
export function floorFromNonMemberRole(
  roleName: string,
  nonMemberPermissions: readonly GroupPermissionKey[],
): GroupPermissionKey[] {
  if (roleName === NONE_ROLE) {
    return [...nonMemberPermissions]
  }
  return nonMemberPermissions.filter((permission) => {
    if (permission === 'group.join.request') {
      return false
    }
    if (permission === 'group.join') {
      return !isActiveMembershipRole(roleName)
    }
    return true
  })
}

// Who may act on whom inside a group, and who may hand out which role.
//
// Three independent things have to hold, and keeping them apart is what makes the rules
// explainable:
//
//   1. The RIGHT itself — `group.member.role.assign` / `group.member.remove`. Checked in
//      the shield, and re-checked here so a caller cannot forget it.
//   2. DOMINANCE over the target — the same rule the network layer uses for
//      disable/delete (role/dominance.ts, reused rather than reimplemented): the actor's
//      rights must be a STRICT superset of the target's. Peers therefore cannot act on
//      each other, which is why two owners can never remove one another.
//   3. COVERAGE of the assigned role — an actor can never hand out more than they hold.
//      Today this is the literal `adminCanSetRole = ['pending','usual','admin']`; as a set
//      rule it needs no list and extends to freely defined roles by itself.
//
// (2) and (3) together are what keeps an admin in an owner-less group (concept E8) from
// promoting themselves to owner: the owner role resolves to the full catalog, so only
// somebody who already holds everything can assign it.
//
// The one exception to (2) comes from OUTSIDE the group: a network admin who has elevated
// with `group.administer.any_<visibility>` stands above every member, owners included
// (`outranksMembers`). By rights alone they are only an owner's peer, and peers cannot act on
// each other — which would leave a group whose owner abuses it or has vanished with no way back
// but switching it off. (1) and (3) still hold for them.
import { dominates } from '@src/role'

import type { GroupPermissionKey } from '@src/groupPermission'

/**
 * Rights about one's OWN membership, excluded from the dominance comparison.
 *
 * They are eligibility, not authority: a non-member may ask to join and a member may
 * leave, but neither says anything about power over other people. Comparing them would
 * invert the ladder — a non-member holds `group.join`, which no member holds, so a member
 * would not dominate a non-member and an admin could not add one to the group.
 */
export const SELF_SERVICE_PERMISSIONS: readonly GroupPermissionKey[] = [
  'group.join',
  'group.join.request',
  'group.leave',
]

/**
 * Taking part in a group: writing in it and talking in it. Excluded from both comparisons, for
 * the same reason as the self-service rights — they are what a member DOES, not power over
 * anybody — and because they are exactly what a network admin acting in a group does not get
 * (networkAuthority.ts): to post or talk there, they have to join it like anybody else. Counting
 * them would leave that admin outranking nobody, since every member role holds them.
 *
 * The ladder between roles is therefore drawn by authority alone: pinning, taking posts out,
 * inviting, removing and re-roling members, settings, rights.
 */
export const PARTICIPATION_PERMISSIONS: readonly GroupPermissionKey[] = [
  'group.post.create',
  'group.comment.create',
  'group.chat.participate',
  'group.videoCall.create',
  'group.videoCall.join',
]

const NOT_AUTHORITY: readonly GroupPermissionKey[] = [
  ...SELF_SERVICE_PERMISSIONS,
  ...PARTICIPATION_PERMISSIONS,
]

const withoutSelfService = (
  permissions: ReadonlySet<GroupPermissionKey>,
): Set<GroupPermissionKey> => {
  const authority = new Set(permissions)
  for (const key of NOT_AUTHORITY) {
    authority.delete(key)
  }
  return authority
}

/**
 * Whether the actor outranks the target inside this group: a strict superset of their
 * AUTHORITY (see SELF_SERVICE_PERMISSIONS and PARTICIPATION_PERMISSIONS).
 */
export function dominatesInGroup(
  actor: ReadonlySet<GroupPermissionKey>,
  target: ReadonlySet<GroupPermissionKey>,
): boolean {
  return dominates(withoutSelfService(actor), withoutSelfService(target))
}

/**
 * Whether the actor holds every right the role they want to assign would grant — every right
 * that is AUTHORITY, that is. A role that may leave or post in the group gives nobody power over
 * anybody, so somebody who may do neither there (a network admin acting in a group they are not
 * in) can still hand it out.
 */
export function coversRole(
  actor: ReadonlySet<GroupPermissionKey>,
  assignedRole: ReadonlySet<GroupPermissionKey>,
): boolean {
  for (const permission of withoutSelfService(assignedRole)) {
    if (!actor.has(permission)) {
      return false
    }
  }
  return true
}

/** Where the actor stands beyond their rights — see `outranksMembers` above. */
export interface ActorStanding {
  outranksMembers?: boolean
}

/**
 * Whether the actor may give this member that role: they need the right, they must
 * outrank the member as they are now, and they must cover the role the member would
 * become.
 */
export function mayAssignGroupRole(
  actor: ReadonlySet<GroupPermissionKey>,
  targetCurrent: ReadonlySet<GroupPermissionKey>,
  assignedRole: ReadonlySet<GroupPermissionKey>,
  { outranksMembers = false }: ActorStanding = {},
): boolean {
  return (
    actor.has('group.member.role.assign') &&
    (outranksMembers || dominatesInGroup(actor, targetCurrent)) &&
    coversRole(actor, assignedRole)
  )
}

/**
 * Whether the actor may remove this member: the right plus dominance. No coverage rule —
 * removing grants nothing.
 */
export function mayRemoveGroupMember(
  actor: ReadonlySet<GroupPermissionKey>,
  target: ReadonlySet<GroupPermissionKey>,
  { outranksMembers = false }: ActorStanding = {},
): boolean {
  return actor.has('group.member.remove') && (outranksMembers || dominatesInGroup(actor, target))
}

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

const withoutSelfService = (
  permissions: ReadonlySet<GroupPermissionKey>,
): Set<GroupPermissionKey> => {
  const authority = new Set(permissions)
  for (const key of SELF_SERVICE_PERMISSIONS) {
    authority.delete(key)
  }
  return authority
}

/**
 * Whether the actor outranks the target inside this group: a strict superset of their
 * AUTHORITY (see SELF_SERVICE_PERMISSIONS).
 */
export function dominatesInGroup(
  actor: ReadonlySet<GroupPermissionKey>,
  target: ReadonlySet<GroupPermissionKey>,
): boolean {
  return dominates(withoutSelfService(actor), withoutSelfService(target))
}

/** Whether the actor holds every right the role they want to assign would grant. */
export function coversRole(
  actor: ReadonlySet<GroupPermissionKey>,
  assignedRole: ReadonlySet<GroupPermissionKey>,
): boolean {
  for (const permission of assignedRole) {
    if (!actor.has(permission)) {
      return false
    }
  }
  return true
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
): boolean {
  return (
    actor.has('group.member.role.assign') &&
    dominatesInGroup(actor, targetCurrent) &&
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
): boolean {
  return actor.has('group.member.remove') && dominatesInGroup(actor, target)
}

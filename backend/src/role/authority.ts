// Who may act on whom in the network (disable, delete, disable via report review): the
// dominance rule of ./dominance.ts, applied to AUTHORITY only.
//
// Comparing whole permission sets put rights into the ranking that give nobody power over
// anybody. A role built for administration — `user.delete.any` and `user.disable`, but no
// posting — did not dominate the plain `user` role, because `user` holds `post.create` and the
// administrative role does not. It could delete nobody, while the webapp still offered the
// button. Group roles hit the same wall and solved it the same way (groupRole/authority.ts).
//
// Only the rights listed below are left out. A key that is not listed counts — so a right
// added to the catalog later is treated as authority until somebody decides otherwise, which
// is the fail-safe direction for a destructive action: it can only block more, never less.
import { allPermissionKeys } from '@src/permission'

import { dominates } from './dominance'
import { OWNER_ROLE } from './types'

import type { PermissionKey } from '@src/permission'

/**
 * Rights about one's OWN participation, excluded from the act-on comparison: writing,
 * talking, inviting people in, creating groups, managing one's own keys and links. They are
 * what a member DOES, not power over another member, and every ordinary role holds them —
 * counting them would let a role outrank `user` only by also being allowed to post.
 */
export const PARTICIPATION_PERMISSIONS: readonly PermissionKey[] = [
  'post.create',
  'comment.create',
  'socialMedia.create',
  'group.create_public',
  'group.create_closed',
  'group.create_hidden',
  'user.invite',
  'videoCall.create_open',
  'videoCall.create_restricted',
  'apiKey.create',
]

const authorityOf = (permissions: ReadonlySet<PermissionKey>): Set<PermissionKey> => {
  const authority = new Set(permissions)
  for (const key of PARTICIPATION_PERMISSIONS) {
    authority.delete(key)
  }
  return authority
}

const holdsFullCatalog = (permissions: ReadonlySet<PermissionKey>): boolean =>
  allPermissionKeys().every((key) => permissions.has(key))

/**
 * Whether the actor outranks the target in the network: their AUTHORITY is a strict superset
 * of the target's. Peers, higher targets and incomparable roles stay blocked, exactly as with
 * the full sets — only participation no longer decides the ranking.
 *
 * The full catalog — what `owner` resolves to — outranks everybody who does not hold it. With
 * participation left out, that no longer follows from the sets: the default `admin` role holds
 * every authority right there is, and only participation set it below `owner` before. Two
 * holders of the full catalog stay peers (remove an owner by demoting first).
 */
export function dominatesInNetwork(
  actor: ReadonlySet<PermissionKey>,
  target: ReadonlySet<PermissionKey>,
): boolean {
  if (holdsFullCatalog(actor) && !holdsFullCatalog(target)) {
    return true
  }
  return dominates(authorityOf(actor), authorityOf(target))
}

/**
 * Whether the actor's rights cover a set they hand out: every AUTHORITY right in it is one the
 * actor holds. Nobody may give away power they do not have — to somebody else, to themselves,
 * or by writing it into a role. Participation is left out for the reason it is left out of the
 * ranking: an administrative role without `post.create` must still be able to hand out `user`.
 */
export function coversInNetwork(
  actor: ReadonlySet<PermissionKey>,
  granted: Iterable<PermissionKey>,
): boolean {
  for (const key of authorityOf(new Set(granted))) {
    if (!actor.has(key)) {
      return false
    }
  }
  return true
}

/** Why a role change is refused, or `null` when it is allowed. */
export type NetworkRoleRefusal = 'notOutranked' | 'notCovered' | 'ownerOnly' | 'wouldOutrank'

interface Actor {
  permissions: ReadonlySet<PermissionKey>
  roleName: string
}

/**
 * Whether the actor may give a user a role (#10485). The same three rules the groups follow
 * (groupRole/authority.ts):
 *
 *   - they outrank the user they act on — a moderator does not re-role an admin;
 *   - their rights cover the role they hand out — a moderator does not make anybody an admin;
 *   - on themselves, coverage only: stepping down is fine, stepping up is not.
 *
 * Plus the owner rule: the owner role is given and taken by owners only — and among each
 * other owners are not peers here: an owner may re-role another owner.
 */
export function mayAssignNetworkRole({
  actor,
  self,
  targetPermissions,
  targetRoleName,
  assignedRoleName,
  assignedPermissions,
}: {
  actor: Actor
  self: boolean
  targetPermissions: ReadonlySet<PermissionKey>
  targetRoleName: string
  assignedRoleName: string
  assignedPermissions: ReadonlySet<PermissionKey>
}): NetworkRoleRefusal | null {
  if (
    (assignedRoleName === OWNER_ROLE || targetRoleName === OWNER_ROLE) &&
    actor.roleName !== OWNER_ROLE
  ) {
    return 'ownerOnly'
  }
  // Owners act on everybody, other owners included: that is the owner-only way to take the
  // owner role away (./dominance.ts). The last owner is the resolver's to keep.
  if (
    !self &&
    actor.roleName !== OWNER_ROLE &&
    !dominatesInNetwork(actor.permissions, targetPermissions)
  ) {
    return 'notOutranked'
  }
  if (!coversInNetwork(actor.permissions, assignedPermissions)) {
    return 'notCovered'
  }
  return null
}

/**
 * Whether the actor may change a role itself — its rights, its name, whether it exists.
 *
 * Changing a role acts on everybody who holds it, so it needs the standing to act on them: the
 * actor outranks the role, or it is the actor's OWN role. An admin edits the admin role; a
 * moderator who may manage roles does not.
 *
 * Their own role they shape freely — that is what `role.manage` is for, and it includes giving
 * themselves a right. With one limit: it must not come to outrank a role it does not outrank
 * today (`otherRoles`). Otherwise a moderator would add every admin right plus one and then
 * re-role the admins after all.
 *
 * A role they outrank they can only fill with rights they hold (`newPermissions`): editing it
 * must not lift its holders above the actor.
 */
export function mayChangeNetworkRole({
  actor,
  roleName,
  rolePermissions,
  newPermissions,
  otherRoles = [],
}: {
  actor: Actor
  roleName: string
  rolePermissions: ReadonlySet<PermissionKey>
  newPermissions?: Iterable<PermissionKey>
  otherRoles?: readonly { name: string; permissions: ReadonlySet<PermissionKey> }[]
}): NetworkRoleRefusal | null {
  if (roleName === actor.roleName) {
    if (!newPermissions) {
      return null
    }
    const raised = new Set(newPermissions)
    const overtaken = otherRoles.some(
      (other) =>
        other.name !== roleName &&
        !dominatesInNetwork(actor.permissions, other.permissions) &&
        dominatesInNetwork(raised, other.permissions),
    )
    return overtaken ? 'wouldOutrank' : null
  }
  if (!dominatesInNetwork(actor.permissions, rolePermissions)) {
    return 'notOutranked'
  }
  if (newPermissions && !coversInNetwork(actor.permissions, newPermissions)) {
    return 'notCovered'
  }
  return null
}

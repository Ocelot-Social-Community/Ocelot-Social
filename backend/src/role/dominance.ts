import type { PermissionKey } from '@src/permission'

// The act-on hierarchy: who may disable/delete whom.
//
// There is no rank/ordering field (see the roles concept §3) — hierarchy is
// DERIVED from the permission sets themselves: an actor may act on a target only
// if the actor's effective permissions are a STRICT SUPERSET of the target's
// (actor ⊋ target). "More powerful" is exactly "can do everything you can, and
// more".
//
// Consequences (and why this is the failsafe choice for a destructive action):
//   • Peers (equal sets) — neither dominates → blocked. A holder of a right can
//     never use it on another holder of the same authority.
//   • Higher target (holds something the actor lacks) → blocked.
//   • `owner` resolves to the full catalog, so owner ⊋ every non-owner (owner can
//     act on anyone) and owner ⊀ owner (two owners can't act on each other — remove
//     an owner via demote-first, the owner-only setUserRole path).
//   • Incomparable custom roles (disjoint extras) → neither dominates → blocked.
//     For delete/disable, erring safe beats deciding by raw permission count.
//
// This is the only place the otherwise display-only broadest-first role ordering
// (RoleService.allRoles) is actually ENFORCED — but as set dominance, a partial
// order, not the total list index.
export function dominates(actor: Set<PermissionKey>, target: Set<PermissionKey>): boolean {
  // Strict: must have strictly more. Combined with target ⊆ actor below, a larger
  // size guarantees a proper superset (equal sets share the same size → blocked).
  if (actor.size <= target.size) {
    return false
  }
  for (const permission of target) {
    if (!actor.has(permission)) {
      return false
    }
  }
  return true
}

// Runtime feature gates for GROUP permissions.
//
// Every key in this catalog is gated by the `groupsEnabled` policy — the group feature as
// a whole. That is applied here, once, instead of being repeated in all twenty catalog
// entries: a truth that holds for the entire catalog cannot drift when it has a single
// place. On top of it a key may declare `gatedBy` (e.g. `videoConference` for the call
// keys), and then it is only effective while EVERY listed gate is open.
//
// Same dependency direction as the network module: rights depend only on policy, and any
// env dependency lives inside the policy's effective value (PolicyService.getEffective
// folds `requiresEnv`), so a gate never reads env.
import { allGroupPermissionGates, gatesFor } from './schema'
import { GROUPS_ENABLED_GATE } from './types'

import type { GroupPermissionGate, GroupPermissionKey } from './types'

// Minimal structural view of the request context a gate needs: the policy service's
// effective reader (which already folds env availability). Kept local so this module
// stays dependency-light and trivially unit-testable.
export interface GroupGateContext {
  policy?: { getEffective: (key: string) => boolean }
}

// Whether a named gate is currently open — i.e. its backing policy is effectively on.
export function isGroupGateOpen(gate: GroupPermissionGate, ctx: GroupGateContext): boolean {
  return ctx.policy?.getEffective(gate) === true
}

// Whether the group feature itself is on. False ⇒ no group permission is effective,
// whatever a group's roles say.
export function areGroupsEnabled(ctx: GroupGateContext): boolean {
  return ctx.policy?.getEffective(GROUPS_ENABLED_GATE) === true
}

// Policy keys whose value gates a group permission: changing one flips availability
// network-wide, so a policy change must re-broadcast the group permission caches.
// `groupsEnabled` is always among them, plus whatever the catalog declares.
export const GROUP_PERMISSION_GATE_POLICY_KEYS: readonly string[] = [
  GROUPS_ENABLED_GATE,
  ...allGroupPermissionGates(),
]

export function isGroupPermissionGatePolicyKey(key: string): boolean {
  return GROUP_PERMISSION_GATE_POLICY_KEYS.includes(key)
}

// Whether a group permission is effective right now: groups must be on, and every gate
// the key declares must be open (AND semantics).
export function isGroupPermissionAvailable(
  key: GroupPermissionKey,
  ctx: GroupGateContext,
): boolean {
  return areGroupsEnabled(ctx) && gatesFor(key).every((gate) => isGroupGateOpen(gate, ctx))
}

// The first gate currently closing a permission — the actionable one to open — or null
// when the permission is effective. `groupsEnabled` is reported first when it is the one
// that is off, because opening anything else would not move the needle.
export function blockingGroupGateFor(
  key: GroupPermissionKey,
  ctx: GroupGateContext,
): string | null {
  if (!areGroupsEnabled(ctx)) {
    return GROUPS_ENABLED_GATE
  }
  return gatesFor(key).find((gate) => !isGroupGateOpen(gate, ctx)) ?? null
}

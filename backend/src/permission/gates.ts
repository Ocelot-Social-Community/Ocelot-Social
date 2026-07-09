// Runtime feature gates for permissions. A permission may declare `gatedBy` in the
// catalog naming the POLICY key that switches it on; while that policy is not
// effectively on, the right exists (and can be bundled into roles) but is NOT
// effective — it is dropped from authorization checks and reported as unavailable to
// the admin UI.
//
// Single dependency direction: roles depend only on policy. Any env dependency lives
// one layer down, inside the policy's effective value: a policy may declare
// `requiresEnv` (e.g. videoConference needs the LiveKit secrets), and PolicyService
// folds that into getEffective() — so a gate never reads env directly. This collapses
// the former two gate sources (config vs policy) into one.
import { allPermissionGates, gatesFor } from './schema'

import type { PermissionGate, PermissionKey } from './types'

// Minimal structural view of the request context a gate needs: just the policy
// service's effective reader (which already folds env availability). Kept local so
// this module stays dependency-light and trivially unit-testable.
export interface GateContext {
  policy?: { getEffective: (key: PermissionGate) => boolean }
}

// Whether a named gate is currently open — i.e. its backing policy is effectively on.
export function isGateOpen(gate: PermissionGate, ctx: GateContext): boolean {
  return ctx.policy?.getEffective(gate) === true
}

// Policy keys whose value gates a permission: changing one flips permission
// availability network-wide, so setPolicy/resetPolicy re-broadcast permissionsChanged
// for them (clients refetch myPermissions + the admin roles catalog). Derived from the
// catalog's `gatedBy` declarations (the single source) rather than hand-listed, so a new
// gated permission auto-registers its gate here. (PermissionGate stays the compile-time
// mirror of these values, drift-guarded in schema.spec.ts.)
export const PERMISSION_GATE_POLICY_KEYS: readonly PermissionGate[] = allPermissionGates()

export function isPermissionGatePolicyKey(key: string): key is PermissionGate {
  return (PERMISSION_GATE_POLICY_KEYS as readonly string[]).includes(key)
}

// Whether a permission is effective right now: ungated permissions always are; a
// gated one only while EVERY backing policy is effectively on (AND semantics).
export function isPermissionAvailable(key: PermissionKey, ctx: GateContext): boolean {
  return gatesFor(key).every((gate) => isGateOpen(gate, ctx))
}

// The first gate currently closing a permission — the actionable one for the admin to
// open — or null when the permission is effective. A multi-gated permission can be
// blocked by more than one policy; surfacing the first-closed lets the admin roles UI
// deep-link straight to a policy that will move the needle (open one, refetch, repeat).
export function blockingGateFor(key: PermissionKey, ctx: GateContext): PermissionGate | null {
  return gatesFor(key).find((gate) => !isGateOpen(gate, ctx)) ?? null
}

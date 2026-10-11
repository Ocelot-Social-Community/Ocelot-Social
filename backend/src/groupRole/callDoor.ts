// Whether a group's video call is a room anybody can walk into.
//
// Opening a call used to be capped per group TYPE (`videoCall.create_public` and friends), and
// the default network role granted only the public one. The intention behind that was never the
// type: it was that a call in a public group is a room a stranger can enter — join the group
// without asking, then join the call — so the platform could not become a private conferencing
// service. The type was a proxy for it, and with the type derived from rights (./privacyLevel.ts)
// the proxy can be replaced by the thing itself:
//
//   open        a stranger may FIND the group (`group.read`) and ENTER it (`group.join`), so
//               they can be in the call without anybody's approval
//   restricted  anything else — the call is behind a request, an invite or an unlisted group
//
// Both halves are needed. `group.join` alone in an unlisted group is a door nobody can see, and
// `group.read` alone is a group one may look at but not enter.
//
// On the three seeded presets this is exactly the old behaviour (public → open, closed and
// hidden → restricted; the drift guard in ./callDoor.spec.ts states it), and it is sharper on
// every custom combination: a closed group that admits everyone directly may open a call, a
// public group that asks for approval may not.
import { isKnownPermission } from '@src/permission'

import { nonMemberAccessFrom } from './nonMemberAccess'

import type { NonMemberAccess } from './nonMemberAccess'
import type { GroupPermissionKey } from '@src/groupPermission'
import type { PermissionKey } from '@src/permission'

export type CallDoor = 'open' | 'restricted'

/** Every value the placeholder can resolve to; the catalog must have a sibling for each. */
export const CALL_DOORS: readonly CallDoor[] = ['open', 'restricted']

/**
 * The door a non-member role's rights imply. Total: every combination has an answer.
 *
 * Takes only the two flags it reads, so a caller holding them off the group node (the request
 * scope) does not have to invent values for the other two columns.
 */
export function callDoorFrom(
  access: Pick<NonMemberAccess, 'nonMemberRead' | 'nonMemberJoin'>,
): CallDoor {
  return access.nonMemberRead && access.nonMemberJoin ? 'open' : 'restricted'
}

/** The same, from the permission list of a `none` role. */
export function callDoorOfPermissions(
  permissions: readonly GroupPermissionKey[] | null | undefined,
): CallDoor {
  return callDoorFrom(nonMemberAccessFrom(permissions))
}

/**
 * The network right to open a call behind this door — `videoCall.create_open` or
 * `videoCall.create_restricted`. Null when the catalog has no sibling for a door, which the
 * prerequisite resolution turns into a key nobody can hold rather than a silently dropped cap.
 */
export function videoCallCreatePermissionFor(door: CallDoor): PermissionKey | null {
  const key = `videoCall.create_${door}`
  return isKnownPermission(key) ? key : null
}

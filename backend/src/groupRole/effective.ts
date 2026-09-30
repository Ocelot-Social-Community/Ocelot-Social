// Resolving what somebody may actually do inside one group.
//
// The shape of the answer (concept 3.5):
//
//   effectiveInGroup = ( membership role ∪ network authority )
//                      ∩ network prerequisites ∩ open gates
//
// The UNION is the part that is easy to get wrong: a network admin is role `none` in a
// group they are not a member of, and `none ∩ anything` is empty — as a pure
// intersection every `*.any_<type>` right would be inert. The cap comes after, never
// before.
import {
  allGroupPermissionKeys,
  isGroupPermissionAvailable,
  networkPrerequisiteSatisfied,
} from '@src/groupPermission'

import { OWNER_ROLE } from './types'

import type { AuthoritySource, GroupRoleDefinition } from './types'
import type { GroupGateContext, GroupPermissionKey } from '@src/groupPermission'
import type { PermissionKey } from '@src/permission'

/**
 * The permission set a group role grants, before any cap.
 *
 * `owner` resolves to the FULL catalog rather than to a stored list, exactly as the
 * network `owner` role does: a newly added key is owned automatically, and no editing
 * mistake can lock an owner out of their own group.
 *
 * A missing role fails closed to the empty set. That is the state a half-applied
 * migration leaves behind, and an empty set means "may look at nothing", not "may do
 * anything".
 */
export function permissionsForGroupRole(
  role: GroupRoleDefinition | null | undefined,
): Set<GroupPermissionKey> {
  if (!role) {
    return new Set()
  }
  if (role.name === OWNER_ROLE) {
    return new Set(allGroupPermissionKeys())
  }
  return new Set(role.permissions)
}

export interface EffectiveGroupPermissionsInput {
  /** The viewer's role in this group; null/undefined ⇒ no membership at all. */
  role?: GroupRoleDefinition | null
  /**
   * What the viewer may do in this group by virtue of a network right rather than
   * membership — the folded `*.any_<type>` rights. Empty for an ordinary user.
   */
  networkAuthority?: ReadonlySet<GroupPermissionKey>
  /** The viewer's effective NETWORK permissions, for the hard cap. */
  networkEffective: ReadonlySet<PermissionKey>
  /** The group's type, which the per-type prerequisites are resolved against. */
  groupType: string
  /** Policy reader, for the feature gates (groupsEnabled and friends). */
  gateContext: GroupGateContext
}

/**
 * The effective group permissions: both authority sources unioned, then capped by the
 * network prerequisites and the runtime gates.
 */
export function effectiveGroupPermissions({
  role,
  networkAuthority,
  networkEffective,
  groupType,
  gateContext,
}: EffectiveGroupPermissionsInput): Set<GroupPermissionKey> {
  const granted = new Set<GroupPermissionKey>([
    ...permissionsForGroupRole(role),
    ...(networkAuthority ?? []),
  ])
  const effective = new Set<GroupPermissionKey>()
  for (const key of granted) {
    if (!isGroupPermissionAvailable(key, gateContext)) {
      continue
    }
    if (!networkPrerequisiteSatisfied(key, groupType, networkEffective)) {
      continue
    }
    effective.add(key)
  }
  return effective
}

/**
 * Where a held right comes from, or null when it is not held at all.
 *
 * Not a display detail: acting through network authority may only promote EXISTING
 * members (concept E16), and it is marked and logged as a network intervention (E18).
 * Both need to know which of the two sources carried the right.
 */
export function authoritySourceFor(
  key: GroupPermissionKey,
  role: GroupRoleDefinition | null | undefined,
  networkAuthority?: ReadonlySet<GroupPermissionKey>,
): AuthoritySource | null {
  const fromMembership = permissionsForGroupRole(role).has(key)
  const fromNetwork = networkAuthority?.has(key) ?? false
  if (fromMembership && fromNetwork) {
    return 'both'
  }
  if (fromMembership) {
    return 'membership'
  }
  return fromNetwork ? 'network' : null
}

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

import { floorFromNonMemberRole } from './mandatoryRights'
import { NONE_ROLE, OWNER_ROLE } from './types'

import type { CallDoor } from './callDoor'
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
  /** The definition of the viewer's role in this group; null/undefined ⇒ none to go by. */
  role?: GroupRoleDefinition | null
  /**
   * The role name on the viewer's membership edge — `none` without one. Given apart from the
   * definition because the two can disagree: a membership whose role the group does not define
   * (a half-applied migration) has a name but no definition, and it is still a MEMBERSHIP. The
   * floor below needs to know that, or such a member would hold the join rights of a stranger.
   * Falls back to the definition's name.
   */
  roleName?: string
  /**
   * What the viewer may do in this group by virtue of a network right rather than
   * membership — the folded `*.any_<type>` rights. Empty for an ordinary user.
   */
  networkAuthority?: ReadonlySet<GroupPermissionKey>
  /** The viewer's effective NETWORK permissions, for the hard cap. */
  networkEffective: ReadonlySet<PermissionKey>
  /**
   * What this group's NON-MEMBER role grants — the floor nobody inside the group falls below
   * (see floorFromNonMemberRole). Absent means "no floor known", which costs rights rather than
   * inventing them.
   */
  nonMemberPermissions?: readonly GroupPermissionKey[]
  /**
   * Whether a stranger could walk into this group — the value `videoCall.create_<door>` is
   * resolved against (see ./callDoor.ts). Defaults to the stricter `restricted`, so a caller
   * that does not know cannot accidentally hand out the weaker cap.
   */
  callDoor?: CallDoor
  /** Policy reader, for the feature gates (groupsEnabled and friends). */
  gateContext: GroupGateContext
}

/**
 * The effective group permissions: both authority sources unioned, then capped by the
 * network prerequisites and the runtime gates.
 */
export function effectiveGroupPermissions({
  role,
  roleName,
  networkAuthority,
  networkEffective,
  nonMemberPermissions,
  callDoor = 'restricted',
  gateContext,
}: EffectiveGroupPermissionsInput): Set<GroupPermissionKey> {
  const granted = new Set<GroupPermissionKey>([
    ...permissionsForGroupRole(role),
    // The group's own floor: what it grants to strangers, it grants to everybody. An applicant
    // to an open group used to hold LESS than somebody who never asked.
    ...floorFromNonMemberRole(roleName ?? role?.name ?? NONE_ROLE, nonMemberPermissions ?? []),
    ...(networkAuthority ?? []),
  ])
  const effective = new Set<GroupPermissionKey>()
  for (const key of granted) {
    if (!isGroupPermissionAvailable(key, gateContext)) {
      continue
    }
    if (!networkPrerequisiteSatisfied(key, { callDoor }, networkEffective)) {
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
  nonMemberPermissions?: readonly GroupPermissionKey[],
  /** The membership edge's role name; see EffectiveGroupPermissionsInput.roleName. */
  roleName?: string,
): AuthoritySource | null {
  // The floor counts as membership: it comes from the group's own role definitions, which is
  // what this answer distinguishes from a `*.any_*` right carried in from the network.
  const fromMembership =
    permissionsForGroupRole(role).has(key) ||
    floorFromNonMemberRole(
      roleName ?? role?.name ?? NONE_ROLE,
      nonMemberPermissions ?? [],
    ).includes(key)
  const fromNetwork = networkAuthority?.has(key) ?? false
  if (fromMembership && fromNetwork) {
    return 'both'
  }
  if (fromMembership) {
    return 'membership'
  }
  return fromNetwork ? 'network' : null
}

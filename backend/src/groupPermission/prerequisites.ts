// The hard cap between the two rights layers (concept E3): a group permission is only
// effective while its NETWORK counterpart is held as well. Without it, creating a group
// would be a way around network policy — a right revoked network-wide could be granted
// back to oneself inside one's own group.
//
// One prerequisite is not a single key but a family, because what the network grants depends on
// the group it is used in: `videoCall.create_<door>`, per door — open or restricted (see
// groupRole/callDoor.ts). The catalog stores it with the placeholder, so the table stays one
// row per capability, and the resolution below substitutes the group's own value.
//
// There used to be a second one, `group.create_<type>` behind `group.type.change`. The type is
// derived from the rights now, so changing it IS editing the non-member role: the cap lives
// where that edit happens (requirePrivacyCap in graphql/resolvers/groupRoles.ts) rather than in
// a right of its own.
import { isKnownPermission } from '@src/permission'

import { networkPrerequisiteTemplateFor } from './schema'

import type { GroupPermissionKey } from './types'
import type { PermissionKey } from '@src/permission'

// The placeholder the catalog uses for a per-group prerequisite.
const DOOR_PLACEHOLDER = '<door>'

/**
 * What a concrete group is, as far as the placeholders are concerned. Plain strings rather
 * than the derived unions from `groupRole`: the dependency runs the other way (groupRole
 * imports this module), and the substitution is textual — a value the network catalog does
 * not know fails closed below.
 */
export interface PrerequisiteScope {
  /** Whether its call is one a stranger can walk into, for `videoCall.create_<door>`. */
  callDoor: string
}

/**
 * The network permission a group permission additionally requires, resolved against a
 * concrete group — or null when the capability has no network counterpart.
 *
 * Fails CLOSED in the one case that matters: if a placeholder resolves to something the
 * network catalog does not know (a door added without its `videoCall.create_*` sibling), the caller is handed a key that nobody can hold rather than
 * silently dropping the cap. `unknown.<key>` cannot be a catalog key, so it can never be
 * satisfied — the drift guard in ./prerequisites.spec.ts is what keeps this from being
 * reachable in the first place.
 */
export function networkPrerequisiteFor(
  key: GroupPermissionKey,
  scope: PrerequisiteScope,
): PermissionKey | null {
  const template = networkPrerequisiteTemplateFor(key)
  if (template === null) {
    return null
  }
  const resolved = template.replace(DOOR_PLACEHOLDER, scope.callDoor)
  if (resolved === template) {
    return template as PermissionKey
  }
  return isKnownPermission(resolved) ? resolved : (`unknown.${resolved}` as PermissionKey)
}

/**
 * Whether the network side of the cap is satisfied for this key in this group.
 * `effectivePermissions` is the set the request context already resolved from the
 * user's network role.
 */
export function networkPrerequisiteSatisfied(
  key: GroupPermissionKey,
  scope: PrerequisiteScope,
  effectivePermissions: ReadonlySet<PermissionKey>,
): boolean {
  const prerequisite = networkPrerequisiteFor(key, scope)
  return prerequisite === null || effectivePermissions.has(prerequisite)
}

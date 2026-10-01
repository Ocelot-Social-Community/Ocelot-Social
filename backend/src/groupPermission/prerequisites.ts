// The hard cap between the two rights layers (concept E3): a group permission is only
// effective while its NETWORK counterpart is held as well. Without it, creating a group
// would be a way around network policy — a right revoked network-wide could be granted
// back to oneself inside one's own group.
//
// Two prerequisites are not one key but a family, because what the network grants depends on
// the group it is used in:
//
//   `group.create_<type>`        per privacy level — public / closed / hidden
//   `videoCall.create_<door>`    per door — open / restricted (see groupRole/callDoor.ts)
//
// The catalog stores them with the placeholder, so the table stays one row per capability, and
// the resolution below substitutes the group's own value.
import { isKnownPermission } from '@src/permission'

import { networkPrerequisiteTemplateFor } from './schema'

import type { GroupPermissionKey } from './types'
import type { PermissionKey } from '@src/permission'

// The placeholders the catalog uses for a per-group prerequisite.
const TYPE_PLACEHOLDER = '<type>'
const DOOR_PLACEHOLDER = '<door>'

/**
 * What a concrete group is, as far as the placeholders are concerned. Plain strings rather
 * than the derived unions from `groupRole`: the dependency runs the other way (groupRole
 * imports this module), and the substitution is textual — a value the network catalog does
 * not know fails closed below.
 */
export interface PrerequisiteScope {
  /** The group's privacy level, for `group.create_<type>`. */
  groupType: string
  /** Whether its call is one a stranger can walk into, for `videoCall.create_<door>`. */
  callDoor: string
}

/**
 * The network permission a group permission additionally requires, resolved against a
 * concrete group — or null when the capability has no network counterpart.
 *
 * Fails CLOSED in the one case that matters: if a placeholder resolves to something the
 * network catalog does not know (a group type or a door added without its `group.create_*` /
 * `videoCall.create_*` sibling), the caller is handed a key that nobody can hold rather than
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
  const resolved = template
    .replace(TYPE_PLACEHOLDER, scope.groupType)
    .replace(DOOR_PLACEHOLDER, scope.callDoor)
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

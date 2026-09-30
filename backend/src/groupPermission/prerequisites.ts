// The hard cap between the two rights layers (concept E3): a group permission is only
// effective while its NETWORK counterpart is held as well. Without it, creating a group
// would be a way around network policy — a right revoked network-wide could be granted
// back to oneself inside one's own group.
//
// Two of the prerequisites are per group type (`group.create_<type>`,
// `videoCall.create_<type>`), matching the flat per-type families the network catalog
// already uses. The catalog stores them with a '<type>' placeholder so the table stays
// one row per capability instead of three.
import { isKnownPermission } from '@src/permission'

import { networkPrerequisiteTemplateFor } from './schema'

import type { GroupPermissionKey } from './types'
import type { PermissionKey } from '@src/permission'

// The placeholder the catalog uses for a per-group-type prerequisite.
const TYPE_PLACEHOLDER = '<type>'

/**
 * The network permission a group permission additionally requires, resolved for a
 * concrete group type — or null when the capability has no network counterpart.
 *
 * Fails CLOSED in the one case that matters: if a placeholder resolves to something the
 * network catalog does not know (a group type added to the schema without its
 * `group.create_*` / `videoCall.create_*` sibling), the caller is handed a key that
 * nobody can hold rather than silently dropping the cap. `unknown.<key>` cannot be a
 * catalog key, so it can never be satisfied — the drift guard in ./prerequisites.spec.ts
 * is what keeps this from being reachable in the first place.
 */
export function networkPrerequisiteFor(
  key: GroupPermissionKey,
  groupType: string,
): PermissionKey | null {
  const template = networkPrerequisiteTemplateFor(key)
  if (template === null) {
    return null
  }
  if (!template.includes(TYPE_PLACEHOLDER)) {
    return template as PermissionKey
  }
  const resolved = template.replace(TYPE_PLACEHOLDER, groupType)
  return isKnownPermission(resolved) ? resolved : (`unknown.${resolved}` as PermissionKey)
}

/**
 * Whether the network side of the cap is satisfied for this key and group type.
 * `effectivePermissions` is the set the request context already resolved from the
 * user's network role.
 */
export function networkPrerequisiteSatisfied(
  key: GroupPermissionKey,
  groupType: string,
  effectivePermissions: ReadonlySet<PermissionKey>,
): boolean {
  const prerequisite = networkPrerequisiteFor(key, groupType)
  return prerequisite === null || effectivePermissions.has(prerequisite)
}

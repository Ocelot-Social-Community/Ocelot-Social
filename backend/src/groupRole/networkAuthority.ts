// What a NETWORK right lets somebody do inside a group they are not a member of.
//
// Three families fold into group rights (concept 7.3):
//
//   group.administer.any_<type>     the whole group catalog — the recovery path for a group
//                                   left without an owner needs everything an owner has
//   group.content.read.any_<type>   exactly the reading rights, because a moderator has to see
//                                   what they are asked to review and nothing more
//   group.moderate.any_<type>       taking a post out, plus the reading rights: moderating what
//                                   one cannot read would be blind
//
// One module rather than one copy per caller, because the two shapes that need it ask the same
// question from opposite ends. The per-request authorization resolves ONE group and asks "what
// does this viewer hold here"; the list queries have many groups and one viewer, and can only
// afford "which TYPES does this viewer hold it in" — a list bounded by the number of group
// types. Two answers from two tables is how a hidden group ends up readable through one query
// and invisible through the other.
import { allGroupPermissionKeys } from '@src/groupPermission'

import { PRIVACY_LEVELS } from './privacyLevel'

import type { GroupPermissionKey } from '@src/groupPermission'
import type { PermissionKey } from '@src/permission'

/** The network permission set a request already resolved. */
type NetworkPermissions = ReadonlySet<PermissionKey> | { has: (key: PermissionKey) => boolean }

/** What the viewer's network rights grant them inside ANY group of this type. */
export function networkAuthorityIn(
  groupType: string,
  effectivePermissions: NetworkPermissions,
): Set<GroupPermissionKey> {
  const holds = (key: string) => effectivePermissions.has(key as PermissionKey)
  if (holds(`group.administer.any_${groupType}`)) {
    return new Set(allGroupPermissionKeys())
  }
  const authority = new Set<GroupPermissionKey>()
  if (holds(`group.content.read.any_${groupType}`)) {
    authority.add('group.read')
    authority.add('group.content.read')
    authority.add('group.members.read')
  }
  if (holds(`group.moderate.any_${groupType}`)) {
    authority.add('group.read')
    authority.add('group.content.read')
    authority.add('group.post.moderate')
  }
  return authority
}

/**
 * The group types in which the viewer holds this right WITHOUT a membership — the form a
 * many-groups query can use (`group.groupType IN $types`).
 */
export function groupTypesWithNetworkAuthority(
  permission: GroupPermissionKey,
  effectivePermissions: NetworkPermissions,
): string[] {
  return PRIVACY_LEVELS.filter((groupType) =>
    networkAuthorityIn(groupType, effectivePermissions).has(permission),
  )
}

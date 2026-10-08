// What a NETWORK right lets somebody do inside a group they are not a member of.
//
// Three families fold into group rights (concept 7.3):
//
//   group.administer.any_<type>     the whole group catalog but the acts of being IN the group
//                                   (joining, leaving, posting, talking) — the recovery path for
//                                   a group left without an owner needs everything an owner may
//                                   do to it, not a membership
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

import { PARTICIPATION_PERMISSIONS, SELF_SERVICE_PERMISSIONS } from './authority'
import { PRIVACY_LEVELS } from './privacyLevel'

import type { GroupPermissionKey } from '@src/groupPermission'
import type { PermissionKey } from '@src/permission'

/** The network permission set a request already resolved. */
type NetworkPermissions = ReadonlySet<PermissionKey> | { has: (key: PermissionKey) => boolean }

/**
 * What administering a group does NOT include: belonging to it. Joining, asking to and leaving
 * are about one's own membership (SELF_SERVICE_PERMISSIONS); writing, commenting, chatting and
 * calls are taking part (PARTICIPATION_PERMISSIONS). A network admin repairing a group may change
 * everything about it, but to post or talk in it they have to join it like anybody else.
 */
const MEMBERSHIP_ACTS: readonly GroupPermissionKey[] = [
  ...SELF_SERVICE_PERMISSIONS,
  ...PARTICIPATION_PERMISSIONS,
]

/**
 * Whether the viewer's network rights let them ADMINISTER any group of this visibility — the
 * family that stands above every role inside such a group once it is picked up (./authority.ts,
 * `outranksMembers`), because recovering a group from its owner is part of what it is for.
 */
export function administersByNetwork(
  visibility: string,
  effectivePermissions: NetworkPermissions,
): boolean {
  return effectivePermissions.has(`group.administer.any_${visibility}` as PermissionKey)
}

/** What the viewer's network rights grant them inside ANY group of this visibility. */
export function networkAuthorityIn(
  visibility: string,
  effectivePermissions: NetworkPermissions,
): Set<GroupPermissionKey> {
  const holds = (key: string) => effectivePermissions.has(key as PermissionKey)
  if (administersByNetwork(visibility, effectivePermissions)) {
    return new Set(allGroupPermissionKeys().filter((key) => !MEMBERSHIP_ACTS.includes(key)))
  }
  const authority = new Set<GroupPermissionKey>()
  if (holds(`group.content.read.any_${visibility}`)) {
    authority.add('group.read')
    authority.add('group.content.read')
    authority.add('group.members.read')
  }
  if (holds(`group.moderate.any_${visibility}`)) {
    authority.add('group.read')
    authority.add('group.content.read')
    authority.add('group.post.moderate')
  }
  return authority
}

/**
 * The visibilities in which the viewer holds this right WITHOUT a membership — the form a
 * many-groups query can use (`visibilityOf(group) IN $visibilities`).
 */
export function visibilitiesWithNetworkAuthority(
  permission: GroupPermissionKey,
  effectivePermissions: NetworkPermissions,
): string[] {
  return PRIVACY_LEVELS.filter((visibility) =>
    networkAuthorityIn(visibility, effectivePermissions).has(permission),
  )
}

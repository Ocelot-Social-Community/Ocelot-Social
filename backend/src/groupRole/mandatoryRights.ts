// The rights a role cannot be written without.
//
// `group.leave` is the only one, and it is one because of what its absence would mean: a
// membership nobody can end. The other door out of a group is `group.member.remove`, which
// somebody ELSE has to hold and use — so a group whose admins are gone, or simply unwilling,
// would keep its members in it. That is a trap rather than a setting:
//
//   - a membership is a public association (the member list, the feeds, the notifications),
//     and an association one cannot dissolve is the opposite of what a leave button is for;
//   - the code already refused to believe in it: the per-request authorization hands a member
//     `group.leave` back when their role definition is missing (groupRole/requestScope.ts),
//     precisely so a damaged row cannot produce a group its members cannot get out of.
//
// `none` is excluded because it is not a membership: there is nothing to leave. `pending` keeps
// it, where it means withdrawing an application.
import { NONE_ROLE } from './types'

import type { GroupPermissionKey } from '@src/groupPermission'

/** Rights every role that IS a membership holds, whatever an editor ticks. */
export const MANDATORY_MEMBERSHIP_RIGHTS: readonly GroupPermissionKey[] = ['group.leave']

/** Whether this right is one the role in question may not be written without. */
export function isMandatoryFor(roleName: string, permission: GroupPermissionKey): boolean {
  return roleName !== NONE_ROLE && MANDATORY_MEMBERSHIP_RIGHTS.includes(permission)
}

/**
 * The permission list as it must be stored: whatever was asked for, plus the rights that role
 * cannot be without. Applied where roles are written rather than where they are read, so the
 * stored list says what is true instead of being corrected on every lookup.
 */
export function withMandatoryRights(
  roleName: string,
  permissions: readonly GroupPermissionKey[],
): GroupPermissionKey[] {
  const held = new Set(permissions)
  for (const permission of MANDATORY_MEMBERSHIP_RIGHTS) {
    if (isMandatoryFor(roleName, permission)) {
      held.add(permission)
    }
  }
  return [...held]
}

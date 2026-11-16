import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'
import { OWNER_ROLE, coversInNetwork, effectiveRoleName, mayAssignNetworkRole } from '@src/role'

import { roleNameOfUser } from './actOnHierarchy'

import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'
import type { NetworkRoleRefusal } from '@src/role'

// Who may give whom which role (#10485) — asked by the shield before setUserRole runs, and by the
// Role field the admin pages read to offer only what the shield would accept. One answer for
// both, so the button and the decision cannot drift apart (the same split as actOnHierarchy.ts).
//
// Shaping the roles themselves needs `role.manage` only (permissionsMiddleware.ts).

const actorOf = (context: Context) => ({
  permissions: context.effectivePermissions,
  roleName: effectiveRoleName(context.user ?? {}),
})

// The role's rights, or null for a role that does not exist — which the resolver refuses with
// the role's name. `owner` resolves to the full catalog (RoleService.permissionsForRole).
const permissionsOfRole = (context: Context, roleName: string): Set<PermissionKey> | null =>
  context.role.getRole(roleName) || roleName === OWNER_ROLE
    ? context.role.permissionsForRole(roleName)
    : null

/**
 * Whether the viewer may hand this role out at all — the part of the assignment rule that does
 * not depend on whom it goes to. Whether they outrank a particular user is
 * `User.outrankedByCurrentUser`.
 */
export const roleOfferRefusal = (context: Context, roleName: string): NetworkRoleRefusal | null => {
  // Asked for the roles that exist only (the Role field), so no unknown-role case here.
  const assignedPermissions = context.role.permissionsForRole(roleName)
  const actor = actorOf(context)
  if (roleName === OWNER_ROLE && actor.roleName !== OWNER_ROLE) {
    return 'ownerOnly'
  }
  return coversInNetwork(actor.permissions, assignedPermissions) ? null : 'notCovered'
}

/** Whether the viewer may give this user this role. */
export const roleAssignmentRefusal = async (
  context: Context,
  userId: string,
  roleName: string,
): Promise<NetworkRoleRefusal | null> => {
  const assignedPermissions = permissionsOfRole(context, roleName)
  if (!assignedPermissions) {
    return null
  }
  const targetRoleName = await roleNameOfUser(context, userId)
  return mayAssignNetworkRole({
    actor: actorOf(context),
    self: userId === context.user?.id,
    targetPermissions: context.role.permissionsForRole(targetRoleName),
    targetRoleName,
    assignedRoleName: roleName,
    assignedPermissions,
  })
}

/** The refusal of an assignment as the error the shield answers with. */
export const assignmentError = (refusal: NetworkRoleRefusal): AppError => {
  switch (refusal) {
    case 'notOutranked':
      return new AppError(Errors.ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED)
    case 'ownerOnly':
      return new AppError(Errors.ROLE_ASSIGNMENT_OWNER_ROLE_REQUIRES_OWNER)
    case 'notCovered':
      return new AppError(Errors.ROLE_ASSIGNMENT_NOT_COVERED)
  }
}

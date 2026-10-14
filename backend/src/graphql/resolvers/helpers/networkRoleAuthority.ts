import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'
import { allPermissionKeys } from '@src/permission'
import {
  OWNER_ROLE,
  coversInNetwork,
  effectiveRoleName,
  mayAssignNetworkRole,
  mayChangeNetworkRole,
} from '@src/role'

import { roleNameOfUser } from './actOnHierarchy'

import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'
import type { NetworkRoleRefusal } from '@src/role'

// Who may change which role, and who may give whom which role (#10485) — asked by the shield
// before the role mutations run, and by the Role/Permission fields the admin pages read to
// offer only what the shield would accept. One answer for both, so the button and the decision
// cannot drift apart (the same split as actOnHierarchy.ts).

const actorOf = (context: Context) => ({
  permissions: context.effectivePermissions,
  roleName: effectiveRoleName(context.user ?? {}),
})

// Only keys the catalog knows count towards coverage. An unknown key is not "a right the actor
// lacks" but a typo, and RoleService refuses it with its own, more useful message.
const catalogKeys = (permissions: readonly string[]): PermissionKey[] => {
  const known = new Set<string>(allPermissionKeys())
  return permissions.filter((key): key is PermissionKey => known.has(key))
}

// The role's rights, or null for a role that does not exist — which the resolver refuses with
// the role's name. `owner` resolves to the full catalog (RoleService.permissionsForRole).
const permissionsOfRole = (context: Context, roleName: string): Set<PermissionKey> | null =>
  context.role.getRole(roleName) || roleName === OWNER_ROLE
    ? context.role.permissionsForRole(roleName)
    : null

/** Whether the viewer may change this role — its rights, its name, whether it exists. */
export const roleChangeRefusal = (
  context: Context,
  roleName: string,
  newPermissions?: readonly string[],
): NetworkRoleRefusal | null => {
  const rolePermissions = permissionsOfRole(context, roleName)
  // A role that does not exist, or a protected one (`owner`): RoleService refuses any change to
  // it with the specific reason, whoever asks.
  if (!rolePermissions || context.role.getRole(roleName)?.protected) {
    return null
  }
  return mayChangeNetworkRole({
    actor: actorOf(context),
    roleName,
    rolePermissions,
    newPermissions: newPermissions && catalogKeys(newPermissions),
    otherRoles: context.role.allRoles().map((role) => ({
      name: role.name,
      permissions: context.role.permissionsForRole(role.name),
    })),
  })
}

/** Whether the viewer may create a role with these rights: they hold them all. */
export const roleCreateRefusal = (
  context: Context,
  permissions: readonly string[],
): NetworkRoleRefusal | null =>
  coversInNetwork(context.effectivePermissions, catalogKeys(permissions)) ? null : 'notCovered'

/**
 * Whether the viewer may hand this role out at all — the part of the assignment rule that does
 * not depend on whom it goes to. Whether they outrank a particular user is
 * `User.outrankedByCurrentUser`.
 */
export const roleOfferRefusal = (context: Context, roleName: string): NetworkRoleRefusal | null => {
  const assignedPermissions = permissionsOfRole(context, roleName)
  if (!assignedPermissions) {
    return null
  }
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

/** Whether the viewer may grant this right in a role they edit or create. */
export const mayGrantPermission = (context: Context, key: PermissionKey): boolean =>
  coversInNetwork(context.effectivePermissions, [key])

/** The refusal of an assignment as the error the shield answers with. */
export const assignmentError = (refusal: NetworkRoleRefusal): AppError => {
  switch (refusal) {
    case 'notOutranked':
      return new AppError(Errors.ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED)
    case 'ownerOnly':
      return new AppError(Errors.ROLE_ASSIGNMENT_OWNER_ROLE_REQUIRES_OWNER)
    // 'wouldOutrank' belongs to role changes and does not come back from an assignment.
    case 'notCovered':
    case 'wouldOutrank':
      return new AppError(Errors.ROLE_ASSIGNMENT_NOT_COVERED)
  }
}

/** The refusal of a role change as the error the shield answers with. */
export const changeError = (refusal: NetworkRoleRefusal): AppError => {
  switch (refusal) {
    case 'notCovered':
      return new AppError(Errors.ROLE_SAVE_NOT_COVERED)
    case 'wouldOutrank':
      return new AppError(Errors.ROLE_SAVE_WOULD_OUTRANK)
    // 'ownerOnly' belongs to assignments and does not come back from a role change.
    case 'notOutranked':
    case 'ownerOnly':
      return new AppError(Errors.ROLE_CHANGE_NOT_OUTRANKED)
  }
}

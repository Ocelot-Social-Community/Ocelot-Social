import { USER_ROLE } from './types'

export interface RoleBearer {
  // The user's single resolved role name (set at the auth boundary by
  // resolveRoleName). Absent ⇒ the USER_ROLE baseline.
  roleName?: string | null
}

// Collapse the raw HAS_ROLE edge names (as loaded from the DB) to the ONE effective
// role name. SINGLE-ROLE model: exactly one edge is expected.
//   • 0 edges → USER_ROLE baseline
//   • 1 edge  → that role
//   • >1 edges → invariant violation (corrupt data / a write bug). We do NOT pick by
//     array order — that would let edge ordering decide privilege. Fail CLOSED to the
//     baseline so an ambiguous edge set can never be read as elevated access, and log
//     it loudly so it gets fixed.
// This is the single seam where multi-edge corruption is detected; downstream code
// carries only the resolved `roleName`, never the array.
export function resolveRoleName(roleNames: readonly string[] | null | undefined): string {
  const roles = roleNames ?? []
  if (roles.length === 1) return roles[0]
  if (roles.length > 1) {
    // eslint-disable-next-line no-console
    console.warn(
      `resolveRoleName: user has ${String(roles.length)} roles (${roles.join(
        ', ',
      )}); single-role model violated — failing closed to '${USER_ROLE}'.`,
    )
  }
  return USER_ROLE
}

// The single role name a user resolves to: its `roleName` or the USER_ROLE baseline.
export function effectiveRoleName(user: RoleBearer): string {
  return user.roleName ?? USER_ROLE
}

import { USER_ROLE } from './types'

export interface RoleBearer {
  roles?: string[] | null
}

// The single role name for a user (SINGLE-ROLE model — never a union). The source
// of truth is the one HAS_ROLE edge (loaded by decode into `roles`); it falls back
// to the USER_ROLE baseline when the user has no edge. A user always resolves to
// exactly one role name.
export function effectiveRoleName(user: RoleBearer): string {
  if (user.roles && user.roles.length > 0) return user.roles[0]
  return USER_ROLE
}

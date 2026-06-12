import { USER_ROLE } from './types'

export interface RoleBearer {
  role?: string | null
  roles?: string[] | null
}

// The single role name for a user (SINGLE-ROLE model — never a union). The source
// of truth is the one HAS_ROLE edge (loaded by decode into `roles`); it falls back
// to the legacy `role` string (a tier name, pre-migration), then to the USER_ROLE
// baseline. A user always resolves to exactly one role name.
export function effectiveRoleName(user: RoleBearer): string {
  if (user.roles && user.roles.length > 0) return user.roles[0]
  return user.role ?? USER_ROLE
}

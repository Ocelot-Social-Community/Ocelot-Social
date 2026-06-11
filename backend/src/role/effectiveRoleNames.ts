import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

export interface RoleBearer {
  role?: string | null
  roles?: string[] | null
}

// The EXTRA (non-baseline) roles bridged from the legacy flat role string.
// Mirrors how the R5 migration assigns HAS_ROLE edges, which (Variante A) never
// include the implicit baseline — so this returns only the role on top of `user`.
function legacyExtraRoles(role: string | null | undefined): string[] {
  if (role === ADMIN_ROLE) return [ADMIN_ROLE]
  if (role === MODERATOR_ROLE) return [MODERATOR_ROLE]
  if (role === OWNER_ROLE) return [OWNER_ROLE]
  return []
}

// The effective role names for an authenticated user. Variante A: the `user`
// baseline is IMPLICIT — every authenticated user is a member, so USER_ROLE is
// always prepended (deduplicated), even when explicit HAS_ROLE edges omit it.
// Extra roles come from the dynamic HAS_ROLE set when present, otherwise from the
// legacy bridge until the R5 migration retires the `role` field.
export function effectiveRoleNames(user: RoleBearer): string[] {
  const extra = user.roles && user.roles.length > 0 ? user.roles : legacyExtraRoles(user.role)
  return [...new Set([USER_ROLE, ...extra])]
}

import { effectiveRoleName, outranksInNetwork } from '@src/role'

import type { Context } from '@src/context'

// Whether the viewer outranks that user in the act-on hierarchy (role/authority.ts) — the
// question the shield asks before disableUser and DeleteUser, and the webapp asks before
// offering them. One function for both, so the button and the decision cannot drift apart.
//
// The target's role is resolved the way the request context resolves the viewer's: their
// single HAS_ROLE edge, edgeless ⇒ the baseline `user` role, owner ⇒ the full catalog.

/** The role a user resolves to: their single HAS_ROLE edge, or the baseline `user` without one. */
export const roleNameOfUser = async (context: Context, userId: string): Promise<string> => {
  const result = await context.database.query({
    query: `OPTIONAL MATCH (u:User {id: $userId})-[:HAS_ROLE]->(r:Role)
            RETURN coalesce(r.name, 'user') AS roleName`,
    variables: { userId },
  })
  // Exactly one row, always: an OPTIONAL MATCH that finds nothing still returns a row with a null
  // `r`, and the coalesce turns that into 'user'.
  return result.records[0].get('roleName') as string
}

/** Whether the viewer outranks a holder of this role (outranksInNetwork). */
export const viewerOutranksRole = (context: Context, roleName: string): boolean =>
  outranksInNetwork(
    {
      permissions: context.effectivePermissions,
      roleName: effectiveRoleName(context.user ?? {}),
    },
    { permissions: context.role.permissionsForRole(roleName), roleName },
  )

export const viewerOutranksUser = async (context: Context, userId: string): Promise<boolean> =>
  viewerOutranksRole(context, await roleNameOfUser(context, userId))

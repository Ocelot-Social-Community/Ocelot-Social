import { dominatesInNetwork } from '@src/role'

import type { Context } from '@src/context'

// Whether the viewer outranks that user in the act-on hierarchy (role/authority.ts) — the
// question the shield asks before disableUser and DeleteUser, and the webapp asks before
// offering them. One function for both, so the button and the decision cannot drift apart.
//
// The target's role is resolved the way the request context resolves the viewer's: their
// single HAS_ROLE edge, edgeless ⇒ the baseline `user` role, owner ⇒ the full catalog.
export const viewerOutranksUser = async (context: Context, userId: string): Promise<boolean> => {
  const result = await context.database.query({
    query: `OPTIONAL MATCH (u:User {id: $userId})-[:HAS_ROLE]->(r:Role)
            RETURN coalesce(r.name, 'user') AS roleName`,
    variables: { userId },
  })
  // Exactly one row, always: an OPTIONAL MATCH that finds nothing still returns a row with a null
  // `r`, and the coalesce turns that into 'user'.
  const roleName = result.records[0].get('roleName') as string
  return dominatesInNetwork(context.effectivePermissions, context.role.permissionsForRole(roleName))
}

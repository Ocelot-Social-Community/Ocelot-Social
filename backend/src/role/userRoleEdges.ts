import databaseContext from '@context/database'

import { DEFAULT_ROLES } from './defaults'
import { seedRole } from './repository'

type DbContext = ReturnType<typeof databaseContext>

// Ensure the default role nodes exist and every user has exactly one
// (:User)-[:HAS_ROLE]->(:Role) edge matching their legacy `user.role` tier
// (admin/moderator/owner → that role, otherwise the `user` baseline).
//
// Used by the seed and admin-bootstrap CLI scripts: those run as standalone
// scripts that never call RoleService.init(), so without this a freshly
// created database would have NO role edges and the role system would appear
// empty (memberCounts 0), working only via the legacy-role fallback. Idempotent.
// Seed the default role nodes (idempotent, ON CREATE). Needed before any
// HAS_ROLE edge can be created against them.
export async function seedDefaultRoleNodes(db: DbContext = databaseContext()): Promise<void> {
  const now = new Date().toISOString()
  for (const role of DEFAULT_ROLES) {
    await seedRole(db, role, now)
  }
}

export async function ensureUserRoleEdges(db: DbContext = databaseContext()): Promise<void> {
  await seedDefaultRoleNodes(db)
  await db.write({
    query: `MATCH (u:User)
            WHERE NOT (u)-[:HAS_ROLE]->(:Role)
            WITH u, CASE
              WHEN u.role IN ['admin', 'moderator', 'owner'] THEN u.role
              ELSE 'user'
            END AS roleName
            MATCH (r:Role {id: roleName})
            MERGE (u)-[:HAS_ROLE]->(r)`,
  })
}

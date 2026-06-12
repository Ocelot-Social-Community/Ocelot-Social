import databaseContext from '@context/database'

import { DEFAULT_ROLES } from './defaults'
import { seedRole } from './repository'

type DbContext = ReturnType<typeof databaseContext>

// Seed the default role nodes (idempotent, ON CREATE). Needed before any
// HAS_ROLE edge can be created against them.
export async function seedDefaultRoleNodes(db: DbContext = databaseContext()): Promise<void> {
  const now = new Date().toISOString()
  for (const role of DEFAULT_ROLES) {
    await seedRole(db, role, now)
  }
}

// Ensure the default role nodes exist and every user has exactly one
// (:User)-[:HAS_ROLE]->(:Role) edge matching their legacy `user.role` tier
// (admin/moderator/owner → that role, otherwise the `user` baseline).
//
// Used by the seed and owner-bootstrap CLI scripts: those run as standalone
// scripts that never call RoleService.init(), so without this a freshly created
// database would have NO role edges and the role system would appear empty
// (memberCounts 0), working only via the legacy-role fallback. Idempotent.
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

// Promote a user (matched by email, slug, or id) to the single `owner` role — the
// shell escape hatch for legacy instances that have no owner yet (the API only lets
// an existing owner grant owner). Seeds the role nodes, replaces the user's role
// edge with owner, and syncs the legacy tier to 'admin'. Returns the promoted user,
// or null if no user matched.
export async function promoteToOwner(
  identifier: string,
  db: DbContext = databaseContext(),
): Promise<{ id: string; slug: string } | null> {
  await seedDefaultRoleNodes(db)
  const result = await db.write({
    query: `MATCH (u:User)
            OPTIONAL MATCH (u)-[:PRIMARY_EMAIL]->(e:EmailAddress)
            WITH u, e
            WHERE u.id = $identifier OR u.slug = $identifier OR e.email = $identifier
            WITH u LIMIT 1
            OPTIONAL MATCH (u)-[h:HAS_ROLE]->(:Role)
            DELETE h
            WITH u
            MATCH (owner:Role {id: 'owner'})
            MERGE (u)-[:HAS_ROLE]->(owner)
            SET u.role = 'admin'
            RETURN u.id AS id, u.slug AS slug`,
    variables: { identifier },
  })
  const record = result.records[0]
  if (!record) return null
  return { id: record.get('id') as string, slug: record.get('slug') as string }
}

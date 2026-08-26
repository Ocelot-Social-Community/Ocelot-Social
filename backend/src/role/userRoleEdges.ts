import databaseContext from '@context/database'

import { DEFAULT_ROLES, MANDATORY_ROLE_NAMES } from './defaults'
import { readAllRoles, seedRole } from './repository'

import type { RoleDefinition } from './types'

type DbContext = ReturnType<typeof databaseContext>

// Which default roles to (re)create given what already exists:
//   • fresh/empty DB → the full default set (first-run bootstrap)
//   • established DB → only the MANDATORY roles (owner/user) that are missing
//     (self-heal); optional roles (admin/moderator) are NEVER resurrected here,
//     so an operator can delete them permanently. The factory-reset CLI
//     (`db:data:roles`) restores the full set on demand.
function selectRolesToSeed(existingNames: Set<string>): RoleDefinition[] {
  if (existingNames.size === 0) {
    return DEFAULT_ROLES
  }
  return DEFAULT_ROLES.filter(
    (role) => MANDATORY_ROLE_NAMES.includes(role.name) && !existingNames.has(role.name),
  )
}

// Ensure the default role nodes exist (idempotent). Reads once, writes ONLY when
// something is actually missing (steady state: a single read, no writes), then
// returns the persisted role set so callers can reuse it without re-reading.
export async function seedDefaultRoleNodes(
  db: DbContext = databaseContext(),
): Promise<RoleDefinition[]> {
  const existing = await readAllRoles(db)
  const existingNames = new Set(existing.map((role) => role.name))
  const toSeed = selectRolesToSeed(existingNames)
  if (toSeed.length === 0) {
    return existing
  }

  const now = new Date().toISOString()
  for (const role of toSeed) {
    await seedRole(db, role, now)
  }

  // A mandatory role missing on a NON-empty DB is an anomaly: we self-heal it (the
  // network stays up) but must surface it — repeated occurrences point at a deeper
  // problem (bad restore, a rogue delete). A fresh install seeding everything is
  // normal and stays quiet.
  const healedMandatory = toSeed
    .filter((role) => MANDATORY_ROLE_NAMES.includes(role.name))
    .map((role) => role.name)
  if (existingNames.size > 0 && healedMandatory.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `RoleService: restored missing mandatory role(s): ${healedMandatory.join(
        ', ',
      )}. Investigate why they were absent.`,
    )
  }

  // Re-read so the returned set (and the boot invariant that consumes it) reflects
  // what actually persisted, not merely what we attempted to write.
  return readAllRoles(db)
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
// an existing owner grant owner). Seeds the role nodes and replaces the user's role
// edge with owner. Returns the promoted user, or null if no user matched.
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
            RETURN u.id AS id, u.slug AS slug`,
    variables: { identifier },
  })
  const record = result.records[0]
  if (!record) {
    return null
  }
  return { id: record.get('id') as string, slug: record.get('slug') as string }
}

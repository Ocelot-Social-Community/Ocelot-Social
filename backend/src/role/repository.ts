// Neo4j repository for (:Role) nodes. Uniqueness of the role name is owned by the
// neode Role model (`id` primary → uniqueness constraint, installed centrally by
// db/migrate/store.ts → schema.install()); we MERGE on `id` (= the role name) for
// app-level idempotency. `permissions` is stored JSON-stringified (like Setting.value).

import { sanitizePermissions } from '@src/permission'

import type { RoleDefinition } from './types'
import type databaseContext from '@context/database'

type DbContext = ReturnType<typeof databaseContext>

interface RawRoleRow {
  name: string
  description: string | null
  rank: number
  protected: boolean
  permissions: string
}

// Read every stored role, with its permission list sanitised against the catalog
// (catalog-drift keys are dropped — a removed permission grants nothing).
export async function readAllRoles(db: DbContext): Promise<RoleDefinition[]> {
  const result = await db.query({
    query: `MATCH (r:Role)
            RETURN r.name AS name, r.description AS description,
                   r.rank AS rank, r.protected AS protected, r.permissions AS permissions
            ORDER BY r.rank DESC, r.name ASC`,
  })

  return result.records.map((record) => {
    const row = {
      name: record.get('name') as string,
      description: record.get('description') as string | null,
      // neode stores ints as JS numbers via the driver; coerce defensively.
      rank: Number(record.get('rank') ?? 0),
      protected: Boolean(record.get('protected')),
      permissions: (record.get('permissions') as string | null) ?? '[]',
    } satisfies RawRoleRow
    let parsed: unknown = []
    try {
      parsed = JSON.parse(row.permissions)
    } catch (error) {
      // Malformed JSON ⇒ treat as no permissions; rethrow anything unexpected.
      if (!(error instanceof SyntaxError)) throw error
      parsed = []
    }
    return {
      name: row.name,
      description: row.description,
      rank: row.rank,
      protected: row.protected,
      permissions: sanitizePermissions(Array.isArray(parsed) ? (parsed as string[]) : []),
    }
  })
}

// Seed a default role — ON CREATE only, so an admin-edited role is never reverted
// on restart. The boot-seed path.
export async function seedRole(db: DbContext, role: RoleDefinition, now: string): Promise<void> {
  await db.write({
    query: `MERGE (r:Role {id: $name})
            ON CREATE SET r.name = $name,
                          r.description = $description,
                          r.rank = $rank,
                          r.protected = $protected,
                          r.permissions = $permissions,
                          r.createdAt = $now,
                          r.updatedAt = $now`,
    variables: {
      name: role.name,
      description: role.description,
      rank: role.rank,
      protected: role.protected,
      permissions: JSON.stringify(role.permissions),
      now,
    },
  })
}

// Full upsert (admin create/update, and the CLI factory-reset force-overwrite).
export async function writeRole(
  db: DbContext,
  role: RoleDefinition,
  actor: string,
  now: string,
): Promise<void> {
  await db.write({
    query: `MERGE (r:Role {id: $name})
            ON CREATE SET r.createdAt = $now
            SET r.name = $name,
                r.description = $description,
                r.rank = $rank,
                r.protected = $protected,
                r.permissions = $permissions,
                r.updatedAt = $now,
                r.updatedBy = $actor`,
    variables: {
      name: role.name,
      description: role.description,
      rank: role.rank,
      protected: role.protected,
      permissions: JSON.stringify(role.permissions),
      actor,
      now,
    },
  })
}

// Delete a role and all its HAS_ROLE edges (DETACH). Protected roles are guarded
// at the service/resolver layer, not here.
export async function deleteRole(db: DbContext, name: string): Promise<void> {
  await db.write({
    query: `MATCH (r:Role {id: $name}) DETACH DELETE r`,
    variables: { name },
  })
}

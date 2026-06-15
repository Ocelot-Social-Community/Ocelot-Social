import { getDriver } from '@db/neo4j'
import { DEFAULT_ROLES } from '@src/role'

export const description =
  'Normalize to the single-role model: derive every user a single HAS_ROLE edge from their legacy user.role tier (baseline users get the user role; any extra edges collapse to the highest-rank one), then drop the legacy user.role property.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Ensure the default role nodes exist (idempotent), independent of boot order.
    const now = new Date().toISOString()
    for (const role of DEFAULT_ROLES) {
      await transaction.run(
        `MERGE (r:Role {id: $name})
         ON CREATE SET r.name = $name,
                       r.protected = $protected, r.permissions = $permissions,
                       r.createdAt = $now, r.updatedAt = $now`,
        {
          name: role.name,
          protected: role.protected,
          permissions: JSON.stringify(role.permissions),
          now,
        },
      )
    }

    // 1. Every user without a role edge gets one matching their legacy role tier
    //    (self-contained: correct even if the earlier R5 migration did not run).
    await transaction.run(
      `MATCH (u:User)
       WHERE NOT (u)-[:HAS_ROLE]->(:Role)
       WITH u, CASE WHEN u.role IN ['admin', 'moderator', 'owner'] THEN u.role ELSE 'user' END AS roleName
       MATCH (r:Role {id: roleName})
       MERGE (u)-[:HAS_ROLE]->(r)`,
    )

    // 2. Collapse any user with multiple edges to a single one. Defensive
    //    (single-role forbids >1 edge going forward); keeps a deterministic role —
    //    owner if present (never silently demote an owner), otherwise the
    //    alphabetically first — and deletes the rest.
    await transaction.run(
      `MATCH (u:User)-[h:HAS_ROLE]->(r:Role)
       WITH u, h, r ORDER BY CASE WHEN r.name = 'owner' THEN 0 ELSE 1 END ASC, r.name ASC
       WITH u, collect(h) AS rels
       WHERE size(rels) > 1
       FOREACH (rel IN rels[1..] | DELETE rel)`,
    )

    // 3. Drop the legacy user.role property — authorization now resolves solely from
    //    the HAS_ROLE edge derived above.
    await transaction.run(`MATCH (u:User) REMOVE u.role`)

    await transaction.commit()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    // Re-throw the original error (preserves stack/type — `new Error(error)` would
    // stringify it and drop the stack, the established but lossy migration pattern).
    throw error
  } finally {
    await session.close()
  }
}

export function down(_next) {
  // Irreversible: collapsing multiple edges to one discards the others, which
  // cannot be reconstructed.
  throw new Error('Irreversible migration: collapsed role edges cannot be restored.')
}

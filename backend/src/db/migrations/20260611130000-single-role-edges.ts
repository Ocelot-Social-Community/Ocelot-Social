/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'
import { DEFAULT_ROLES } from '@src/role'

export const description =
  'Normalize to the single-role model: every user has exactly one HAS_ROLE edge (baseline users get the user role; any extra edges collapse to the highest-rank one), and the legacy user.role tier is synced.'

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
         ON CREATE SET r.name = $name, r.description = $description, r.rank = $rank,
                       r.protected = $protected, r.permissions = $permissions,
                       r.createdAt = $now, r.updatedAt = $now`,
        {
          name: role.name,
          description: role.description,
          rank: role.rank,
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

    // 2. Collapse any user with multiple edges to a single one — keep the
    //    highest-rank role, delete the rest.
    await transaction.run(
      `MATCH (u:User)-[h:HAS_ROLE]->(r:Role)
       WITH u, h, r ORDER BY r.rank DESC
       WITH u, collect(h) AS rels
       WHERE size(rels) > 1
       FOREACH (rel IN rels[1..] | DELETE rel)`,
    )

    // 3. Sync the legacy user.role tier to the single role.
    await transaction.run(
      `MATCH (u:User)-[:HAS_ROLE]->(r:Role)
       SET u.role = CASE
         WHEN r.name IN ['owner', 'admin'] THEN 'admin'
         WHEN r.name = 'moderator' THEN 'moderator'
         ELSE 'user'
       END`,
    )

    await transaction.commit()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
    await transaction.rollback()
    // eslint-disable-next-line no-console
    console.log('rolled back')
    throw new Error(error)
  } finally {
    await session.close()
  }
}

export function down(_next) {
  // Irreversible: collapsing multiple edges to one discards the others, which
  // cannot be reconstructed.
  throw new Error('Irreversible migration: collapsed role edges cannot be restored.')
}

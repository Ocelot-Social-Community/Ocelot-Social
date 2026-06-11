/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { getDriver } from '@db/neo4j'
import { DEFAULT_ROLES } from '@src/role'

export const description =
  'Migrate legacy user.role to (:User)-[:HAS_ROLE]->(:Role) edges (Variante A: the user baseline stays implicit, so only admin/moderator/owner get an edge)'

// Only non-baseline legacy roles become edges; a plain member (role 'user' or
// anything else) gets NO edge — effectiveRoleNames injects the baseline. This
// mirrors legacyExtraRoles(), so authorization is identical before and after.
const EXTRA_LEGACY_ROLES = ['admin', 'moderator', 'owner']

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Ensure the default role nodes exist regardless of deploy order (the boot
    // seed may not have run yet when migrations execute). Idempotent ON CREATE.
    const now = new Date().toISOString()
    for (const role of DEFAULT_ROLES) {
      await transaction.run(
        `MERGE (r:Role {id: $name})
         ON CREATE SET r.name = $name,
                       r.description = $description,
                       r.rank = $rank,
                       r.protected = $protected,
                       r.permissions = $permissions,
                       r.createdAt = $now,
                       r.updatedAt = $now`,
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

    // Create one HAS_ROLE edge per user whose legacy role is a non-baseline role.
    await transaction.run(
      `MATCH (u:User)
       WHERE u.role IN $roles
       MATCH (r:Role {id: u.role})
       MERGE (u)-[:HAS_ROLE]->(r)`,
      { roles: EXTRA_LEGACY_ROLES },
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

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()

  try {
    // Remove exactly the edges this migration created (those mirroring the legacy
    // role), leaving any manually-assigned roles untouched.
    await transaction.run(
      `MATCH (u:User)-[h:HAS_ROLE]->(r:Role)
       WHERE u.role IN $roles AND r.name = u.role
       DELETE h`,
      { roles: EXTRA_LEGACY_ROLES },
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

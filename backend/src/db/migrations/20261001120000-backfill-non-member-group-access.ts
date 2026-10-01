import { getDriver } from '@db/neo4j'
import {
  defaultNonMemberAccessFor,
  nonMemberAccessFrom,
  parseStoredPermissions,
} from '@src/groupRole'

export const description =
  'Write the derived non-member access columns onto every group: nonMemberRead, nonMemberContentRead and showMembers, each mirroring what the group`s `none` role grants (group.read / group.content.read / group.members.read). They are what the post filter, the group list, the group search and the profile post lists read instead of comparing groupType against a literal — a many-groups statement cannot look up a role per row. A group whose roles are not seeded yet gets the value its type`s seeded template would give it, which is also what the queries` coalesce fallbacks say. Idempotent: it recomputes rather than toggles.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    const result = await transaction.run(
      `MATCH (g:Group)
       OPTIONAL MATCH (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {name: 'none'})
       RETURN g.id AS id, g.groupType AS groupType, r.permissions AS permissions`,
    )
    for (const record of result.records) {
      const stored = record.get('permissions') as string | null
      // No `none` role ⇒ this group predates the group roles (or the seeding migration has
      // not run): take the value its type's template would have given it, so the group keeps
      // behaving exactly as it did before these columns existed.
      const access =
        stored === null
          ? defaultNonMemberAccessFor(record.get('groupType') as string)
          : nonMemberAccessFrom(parseStoredPermissions(stored))
      await transaction.run(
        `MATCH (g:Group {id: $id})
         SET g.nonMemberRead = $nonMemberRead,
             g.nonMemberContentRead = $nonMemberContentRead,
             g.showMembers = $showMembers`,
        { id: record.get('id') as string, ...access },
      )
    }
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // `showMembers` is NOT removed: it predates this migration — it is the group form's own
    // setting, and the code before these columns read it.
    await session.run(`MATCH (g:Group) REMOVE g.nonMemberRead, g.nonMemberContentRead`)
  } finally {
    await session.close()
  }
}

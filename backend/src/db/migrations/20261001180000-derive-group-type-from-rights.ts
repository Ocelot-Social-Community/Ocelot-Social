import { getDriver } from '@db/neo4j'
import { parseStoredPermissions, privacyLevelOfPermissions } from '@src/groupRole'

export const description =
  'Recompute `groupType` from each group`s non-member role, because the type is derived now rather than chosen: hidden when the `none` role cannot read the profile, closed when it cannot read the content, public otherwise (see groupRole/privacyLevel.ts). A group whose stored type disagrees with its own rights was listed as something it is not — and the per-level network rights (group.create_*, group.administer.any_*, group.content.read.any_*) read that type. Groups without role definitions are left alone; the boot repair seeds them and the sync writes the type with them. Idempotent.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    const result = await transaction.run(
      `MATCH (g:Group)-[:HAS_GROUP_ROLE]->(r:GroupRole {name: 'none'})
       RETURN g.id AS id, g.groupType AS storedType, r.permissions AS permissions`,
    )
    let corrected = 0
    for (const record of result.records) {
      const derived = privacyLevelOfPermissions(
        parseStoredPermissions(record.get('permissions') as string | null),
      )
      if (derived === record.get('storedType')) {
        continue
      }
      await transaction.run(`MATCH (g:Group {id: $id}) SET g.groupType = $derived`, {
        id: record.get('id') as string,
        derived,
      })
      corrected += 1
    }
    await transaction.commit()
    if (corrected > 0) {
      // eslint-disable-next-line no-console
      console.log(`derive-group-type: corrected ${String(corrected)} group(s)`)
    }
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Nothing to undo: the value is derived, and the previous one was by definition the same
  // wherever the two agreed. A group whose type this corrected was mislabelled before.
  return Promise.resolve()
}

import { getDriver } from '@db/neo4j'

export const description =
  'Remove `group.member.approve` from every stored group role. The key had no consumer that could do what it names: JoinGroup writes the membership role ON CREATE only, so an existing applicant cannot be promoted through it, and nothing else approves. Adding ANOTHER person to a group — the one act the key was guarding — is giving them a role in it, which `group.member.role.assign` already names, and that is what the shield asks for now. Approving a pending applicant comes back as its own feature, with the UI it needs (#10352). The parser drops unknown keys anyway, so this is about the stored lists telling the truth rather than about effect. Idempotent.'

const REMOVED = 'group.member.approve'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    const result = await transaction.run(
      `MATCH (g:Group)-[:HAS_GROUP_ROLE]->(r:GroupRole)
       WHERE r.permissions CONTAINS $removed
       RETURN g.id AS groupId, r.name AS name, r.permissions AS permissions`,
      { removed: REMOVED },
    )
    for (const record of result.records) {
      // Parsed here rather than through parseStoredPermissions: that one sanitizes against the
      // CURRENT catalog, which no longer knows the key — it would answer with the already
      // cleaned list and this migration would write back what it read. A damaged row is left
      // alone for the audit to report.
      let stored: unknown
      try {
        stored = JSON.parse(record.get('permissions') as string)
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error
        }
        continue
      }
      if (!Array.isArray(stored)) {
        continue
      }
      await transaction.run(
        `MATCH (:Group {id: $groupId})-[:HAS_GROUP_ROLE]->(r:GroupRole {name: $name})
         SET r.permissions = $permissions`,
        {
          groupId: record.get('groupId') as string,
          name: record.get('name') as string,
          permissions: JSON.stringify(stored.filter((key) => key !== REMOVED)),
        },
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
  // Nothing to restore: the key is gone from the catalog, so writing it back would put a list
  // into the database that the parser drops on the next read.
  return Promise.resolve()
}

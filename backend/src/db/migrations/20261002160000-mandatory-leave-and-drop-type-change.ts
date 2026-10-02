import { getDriver } from '@db/neo4j'

export const description =
  'Two catalog corrections in the stored roles. `group.type.change` is removed: the group type is derived from the rights now, so changing it IS editing the non-member and applicant roles, and that is what `group.role.manage` governs — a separate key was a second name for one way of using it. `group.leave` is added to every role that is a membership (everything but `none`, which is the absence of one): a role without it is a group its members cannot leave, with the only other door — `group.member.remove` — in somebody else`s hands. Idempotent.'

const REMOVED = 'group.type.change'
const MANDATORY = 'group.leave'
const NO_MEMBERSHIP_ROLE = 'none'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Both labels carry the same stored shape; the queries are written out rather than built
    // from a variable so no label name can be interpolated from anywhere but here.
    const queries = [
      'MATCH (g:Group)-[:HAS_GROUP_ROLE]->(r:GroupRole) RETURN g.id AS scope, r.name AS name, r.permissions AS permissions',
      'MATCH (r:GroupRoleTemplate) RETURN r.groupType AS scope, r.name AS name, r.permissions AS permissions',
    ]
    const writes = [
      'MATCH (:Group {id: $scope})-[:HAS_GROUP_ROLE]->(r:GroupRole {name: $name}) SET r.permissions = $permissions',
      'MATCH (r:GroupRoleTemplate {groupType: $scope, name: $name}) SET r.permissions = $permissions',
    ]
    for (const [index, read] of queries.entries()) {
      const write = writes.at(index) as string
      const result = await transaction.run(read)
      for (const record of result.records) {
        const name = record.get('name') as string
        let stored: unknown
        try {
          stored = JSON.parse((record.get('permissions') as string | null) ?? '[]')
        } catch (error) {
          if (!(error instanceof SyntaxError)) {
            throw error
          }
          continue
        }
        if (!Array.isArray(stored)) {
          continue
        }
        const keys = stored.filter((key): key is string => typeof key === 'string')
        const next = keys.filter((key) => key !== REMOVED)
        // The owner role stores no list at all and resolves to the whole catalog; adding a key
        // to it would be the one way to make that list a lie.
        if (name !== NO_MEMBERSHIP_ROLE && next.length > 0 && !next.includes(MANDATORY)) {
          next.push(MANDATORY)
        }
        // Nothing to write when the list is already what it should be — which is what makes
        // re-running this migration a no-op.
        if (next.join(',') === keys.join(',')) {
          continue
        }
        await transaction.run(write, {
          scope: record.get('scope') as string,
          name,
          permissions: JSON.stringify(next),
        })
      }
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
  // Neither half can be undone meaningfully: `group.type.change` is gone from the catalog, so
  // writing it back would store a key the parser drops on the next read, and `group.leave` was
  // added because a role without it is a state the model does not accept.
  return Promise.resolve()
}

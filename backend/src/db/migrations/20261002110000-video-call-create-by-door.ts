import { getDriver } from '@db/neo4j'

export const description =
  'Replace the per-group-type video call rights with per-DOOR ones: `videoCall.create_public` becomes `videoCall.create_open`, `videoCall.create_closed` and `videoCall.create_hidden` become `videoCall.create_restricted`. What the old family was really about was never the type but whether a stranger can walk into the call — find the group and join it without approval — so the cap now asks that directly (see groupRole/callDoor.ts). Also backfills `Group.nonMemberJoin`, the derived column the door is read from, mirroring `group.join` on each group`s `none` role (a group without roles gets what its type`s template would give it). On the three seeded presets nothing changes hands: public was open, closed and hidden were not. Idempotent.'

// Old key → new key. Two of the three collapse, so the rewrite has to deduplicate.
const RENAMES = new Map([
  ['videoCall.create_public', 'videoCall.create_open'],
  ['videoCall.create_closed', 'videoCall.create_restricted'],
  ['videoCall.create_hidden', 'videoCall.create_restricted'],
])

const rewrite = (permissions: unknown): string[] | null => {
  if (!Array.isArray(permissions)) {
    return null
  }
  const keys = permissions.filter((key): key is string => typeof key === 'string')
  if (!keys.some((key) => RENAMES.has(key))) {
    return null
  }
  const renamed: string[] = []
  for (const key of keys) {
    const next = RENAMES.get(key) ?? key
    if (!renamed.includes(next)) {
      renamed.push(next)
    }
  }
  return renamed
}

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // 1. The network roles that hand the right out.
    const roles = await transaction.run(
      `MATCH (r:Role) WHERE r.permissions CONTAINS 'videoCall.create_'
       RETURN r.name AS name, r.permissions AS permissions`,
    )
    for (const record of roles.records) {
      let stored: unknown
      try {
        stored = JSON.parse(record.get('permissions') as string)
      } catch (error) {
        // A list that is not JSON is a real fault and has to surface; only malformed JSON is
        // left for the audit to report.
        if (!(error instanceof SyntaxError)) {
          throw error
        }
        continue
      }
      const renamed = rewrite(stored)
      if (renamed === null) {
        continue
      }
      await transaction.run(`MATCH (r:Role {name: $name}) SET r.permissions = $permissions`, {
        name: record.get('name') as string,
        permissions: JSON.stringify(renamed),
      })
    }

    // 2. The column the door is derived from. `group.join` on the group's own `none` role,
    //    falling back to what the type's template grants when the group has no roles yet —
    //    the same fallback the queries' coalesce() spells.
    await transaction.run(
      `MATCH (g:Group)
       OPTIONAL MATCH (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {name: 'none'})
       SET g.nonMemberJoin = CASE
         WHEN r IS NULL THEN g.groupType = 'public'
         ELSE coalesce(r.permissions, '[]') CONTAINS '"group.join"'
       END`,
    )
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
  const transaction = session.beginTransaction()
  try {
    // `_restricted` maps back to BOTH closed and hidden, which is the honest reverse: a role
    // that may open a call in a group one cannot walk into could do so in either kind.
    await transaction.run(
      `MATCH (r:Role) WHERE r.permissions CONTAINS 'videoCall.create_open'
       SET r.permissions = replace(r.permissions, 'videoCall.create_open', 'videoCall.create_public')`,
    )
    await transaction.run(
      `MATCH (r:Role) WHERE r.permissions CONTAINS 'videoCall.create_restricted'
       SET r.permissions = replace(
         r.permissions,
         '"videoCall.create_restricted"',
         '"videoCall.create_closed","videoCall.create_hidden"'
       )`,
    )
    await transaction.run(`MATCH (g:Group) REMOVE g.nonMemberJoin`)
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    await session.close()
  }
}

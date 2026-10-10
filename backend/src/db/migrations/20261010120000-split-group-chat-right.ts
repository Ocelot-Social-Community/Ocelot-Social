import { getDriver } from '@db/neo4j'

export const description =
  'Split group.chat.participate into group.chat.read and group.chat.write (#10355), on every GroupRole and GroupRoleTemplate. A role that held participate holds both. A membership role without it but with group.content.read gets group.chat.read: the right only ever gated writing, and its members read the chat all along. The non-member role gets neither (the chat rights are moot on it), and nothing else changes. The group chat rooms then follow the new right: a member whose role may not read the chat leaves its room. Down maps group.chat.write back to participate, drops both and puts every member but applicants back into the rooms, as before. Idempotent; rolesCustomizedAt is left alone.'

const PARTICIPATE = 'group.chat.participate'
const READ = 'group.chat.read'
const WRITE = 'group.chat.write'
const NONE_ROLE = 'none'
const PENDING_ROLE = 'pending'

type Transform = (roleName: string, permissions: string[]) => string[]

/** The keys, each once, in the order they first appear. */
const unique = (keys: string[]) => keys.filter((key, index) => keys.indexOf(key) === index)

// Group roles store their permission keys JSON-stringified on the node, like network roles;
// Cypher can't rewrite that cleanly, so parse, change and write back in JS — the roles of every
// group and the templates, and the chat rooms after them, within one transaction.
async function migrate(transform: Transform, syncRoomsCypher: string) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    const result = await transaction.run(
      `MATCH (r) WHERE r:GroupRole OR r:GroupRoleTemplate
       RETURN id(r) AS node, r.id AS id, r.name AS name, r.permissions AS permissions`,
    )
    for (const record of result.records) {
      const id = record.get('id') as string
      let parsed: unknown
      try {
        parsed = JSON.parse((record.get('permissions') as string | null) ?? '[]')
      } catch (error: unknown) {
        throw new Error(
          `Migration aborted: group role ${id} has malformed permissions JSON; fix it manually before re-running. Cause: ${String(error)}`,
          { cause: error },
        )
      }
      if (!Array.isArray(parsed)) {
        throw new Error(
          `Migration aborted: group role ${id} has non-array permissions JSON; fix it manually before re-running.`,
        )
      }
      const current = parsed as string[]
      const next = transform(record.get('name') as string, current)
      if (JSON.stringify(next) === JSON.stringify(current)) {
        continue
      }
      // updatedAt stays: the role's content did not change, only how a key is spelled. And
      // rolesCustomizedAt (on the group) is not touched — a rename by the code is not an edit by
      // the group, and "never customised" is what applying a template later selects by.
      await transaction.run(`MATCH (r) WHERE id(r) = $node SET r.permissions = $permissions`, {
        node: record.get('node') as unknown,
        permissions: JSON.stringify(next),
      })
    }
    await transaction.run(syncRoomsCypher)
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    await session.close()
  }
}

// The owner stores an empty list and holds the whole catalog, the read right with it.
const holds = (key: string) =>
  `(role.name = 'owner' OR coalesce(role.permissions, '') CONTAINS '"${key}"')`

export async function up(_next) {
  await migrate(
    (roleName, permissions) => {
      const without = permissions.filter((key) => key !== PARTICIPATE)
      if (roleName === NONE_ROLE) {
        return without.filter((key) => key !== READ && key !== WRITE)
      }
      if (permissions.includes(PARTICIPATE)) {
        return unique([...without, READ, WRITE])
      }
      if (roleName !== PENDING_ROLE && permissions.includes('group.content.read')) {
        return unique([...without, READ])
      }
      return without
    },
    `MATCH (participant:User)-[chatsIn:CHATS_IN]->(:Room)-[:ROOM_FOR]->(g:Group)
     WHERE NOT EXISTS {
       MATCH (participant)-[membership:MEMBER_OF]->(g),
             (g)-[:HAS_GROUP_ROLE]->(role:GroupRole)
       WHERE role.name = membership.role AND (${holds(READ)} OR ${holds(WRITE)})
     }
     DELETE chatsIn`,
  )
}

export async function down(_next) {
  await migrate(
    (_roleName, permissions) => {
      const without = permissions.filter((key) => key !== READ && key !== WRITE)
      return permissions.includes(WRITE) ? unique([...without, PARTICIPATE]) : without
    },
    `MATCH (room:Room)-[:ROOM_FOR]->(g:Group)<-[membership:MEMBER_OF]-(member:User)
     WHERE membership.role <> '${PENDING_ROLE}'
     MERGE (member)-[:CHATS_IN]->(room)`,
  )
}

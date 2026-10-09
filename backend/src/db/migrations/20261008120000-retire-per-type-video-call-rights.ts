import { getDriver } from '@db/neo4j'

export const description =
  'Retire the per-type video call rights. Since 20261004110000-network-group-rights every role that held videoCall.create_public also holds videoCall.create_open, and one that held _closed or _hidden also holds videoCall.create_restricted; the per-type keys stayed only while the webapp still read them. They are removed from every stored role now. Down derives them back from their successors. Idempotent.'

const RETIRED = ['videoCall.create_public', 'videoCall.create_closed', 'videoCall.create_hidden']

// The way back: a role that may open a call a stranger can walk into could do so in a public
// group; one that may open a restricted call could do so in a closed or a hidden one.
const PREDECESSORS = new Map([
  ['videoCall.create_open', ['videoCall.create_public']],
  ['videoCall.create_restricted', ['videoCall.create_closed', 'videoCall.create_hidden']],
])

// Roles store their permission keys JSON-stringified on the node; Cypher can't rewrite that
// cleanly, so parse, change and write back in JS within one transaction.
async function rewriteRolePermissions(transform: (permissions: string[]) => string[]) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    const result = await transaction.run(
      `MATCH (r:Role) WHERE coalesce(r.protected, false) = false
       RETURN r.id AS id, r.permissions AS permissions`,
    )
    const now = new Date().toISOString()
    for (const record of result.records) {
      const id = record.get('id') as string
      let parsed: unknown
      try {
        parsed = JSON.parse((record.get('permissions') as string | null) ?? '[]')
      } catch (error: unknown) {
        throw new Error(
          `Migration aborted: role ${id} has malformed permissions JSON; fix it manually before re-running. Cause: ${String(error)}`,
          { cause: error },
        )
      }
      if (!Array.isArray(parsed)) {
        throw new Error(
          `Migration aborted: role ${id} has non-array permissions JSON; fix it manually before re-running.`,
        )
      }
      const permissions = parsed as string[]
      const next = transform(permissions)
      if (JSON.stringify(next) === JSON.stringify(permissions)) {
        continue
      }
      await transaction.run(
        `MATCH (r:Role {id: $id}) SET r.permissions = $permissions, r.updatedAt = $now`,
        { id, permissions: JSON.stringify(next), now },
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

/** The keys, each once, in the order they first appear. */
const unique = (keys: string[]) => keys.filter((key, index) => keys.indexOf(key) === index)

export async function up(_next) {
  await rewriteRolePermissions((permissions) =>
    permissions.filter((permission) => !RETIRED.includes(permission)),
  )
}

export async function down(_next) {
  await rewriteRolePermissions((permissions) =>
    unique([...permissions, ...permissions.flatMap((key) => PREDECESSORS.get(key) ?? [])]),
  )
}

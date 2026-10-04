import { getDriver } from '@db/neo4j'

export const description =
  'Bring the stored network roles up to the group rights system, by rule rather than by list — the boot seed is edit-respecting (ON CREATE only) and does not touch an existing role. A role with content.moderate may read and moderate CLOSED groups it is not a member of (group.content.read.any_closed, group.moderate.any_closed: a report about content in a closed group could not be reviewed before, #9405). A role with role.manage also gets that, plus the hidden-group read and moderation, group.administer.any_public/_closed/_hidden and group.roleTemplate.manage (#6751, and the recovery path for a group left without an owner). The video call rights are asked per door rather than per type: videoCall.create_public becomes videoCall.create_open, videoCall.create_closed and _hidden become videoCall.create_restricted (groupRole/callDoor.ts). Nothing is granted to the baseline; owner expands to the full catalog and stores nothing. Idempotent.'

const FOR_MODERATION = ['group.content.read.any_closed', 'group.moderate.any_closed']
const FOR_ADMINISTRATION = [
  'group.content.read.any_hidden',
  'group.moderate.any_hidden',
  'group.administer.any_public',
  'group.administer.any_closed',
  'group.administer.any_hidden',
  'group.roleTemplate.manage',
]
const ALL_ADDED = [...FOR_MODERATION, ...FOR_ADMINISTRATION]

// What the call was really about was never the type but whether a stranger can walk in.
const VIDEO_CALL_RENAMES = new Map([
  ['videoCall.create_public', 'videoCall.create_open'],
  ['videoCall.create_closed', 'videoCall.create_restricted'],
  ['videoCall.create_hidden', 'videoCall.create_restricted'],
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

const add = (permissions: string[], keys: string[]) => unique([...permissions, ...keys])

export async function up(_next) {
  await rewriteRolePermissions((permissions) => {
    let next = unique(permissions.map((key) => VIDEO_CALL_RENAMES.get(key) ?? key))
    if (permissions.includes('content.moderate')) {
      next = add(next, FOR_MODERATION)
    }
    if (permissions.includes('role.manage')) {
      // An administering role must also hold everything the moderating one does, or the act-on
      // dominance chain owner ⊋ admin ⊋ moderator ⊋ user breaks.
      next = add(next, [...FOR_MODERATION, ...FOR_ADMINISTRATION])
    }
    return next
  })
}

export async function down(_next) {
  await rewriteRolePermissions((permissions) =>
    unique(
      permissions
        .filter((permission) => !ALL_ADDED.includes(permission))
        // `_restricted` maps back to BOTH closed and hidden, which is the honest reverse: a role
        // that may open a call in a group one cannot walk into could do so in either kind.
        .flatMap((permission) => {
          if (permission === 'videoCall.create_open') {
            return ['videoCall.create_public']
          }
          if (permission === 'videoCall.create_restricted') {
            return ['videoCall.create_closed', 'videoCall.create_hidden']
          }
          return [permission]
        }),
    ),
  )
}

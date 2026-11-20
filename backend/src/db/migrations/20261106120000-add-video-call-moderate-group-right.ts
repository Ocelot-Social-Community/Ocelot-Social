import { getDriver } from '@db/neo4j'

export const description =
  'Grant the new group right group.videoCall.moderate to the `admin` role of every group and of every group role template, as the shipped templates do for new groups. It lets an admin take over the moderation of a call somebody else started; starting a call needs no right to moderate it. The owner role resolves to the whole catalog and needs nothing. Idempotent.'

const PERMISSION = 'group.videoCall.moderate'
const ROLE = 'admin'

// Group roles and template roles store their permission keys JSON-stringified on the node, as
// the network roles do; parsed, changed and written back here, within one transaction.
async function rewriteAdminPermissions(transform: (permissions: string[]) => string[]) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    const result = await transaction.run(
      // Each role is locked before its permissions are read — writing to it takes its write
      // lock, held until the transaction ends; the property is removed again at once. A role
      // edited meanwhile then waits, and is not overwritten with what was read before it.
      `MATCH (r) WHERE (r:GroupRole OR r:GroupRoleTemplate) AND r.name = $role
       SET r.migrationLock = true
       REMOVE r.migrationLock
       RETURN id(r) AS node, r.id AS id, r.permissions AS permissions`,
      { role: ROLE },
    )
    const now = new Date().toISOString()
    for (const record of result.records) {
      const id = record.get('id') as string
      // Handed back as the driver read it: a Neo4j integer, exact also beyond JavaScript's.
      const node: unknown = record.get('node')
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
      const permissions = parsed as string[]
      const next = transform(permissions)
      if (JSON.stringify(next) === JSON.stringify(permissions)) {
        continue
      }
      await transaction.run(
        // The very node read, not every one of that id: ids are unique only within each label.
        // A group may be given its id by the client, so `<groupId>:admin` can be a template's
        // `<template>:admin` as well.
        `MATCH (r) WHERE id(r) = $node
         SET r.permissions = $permissions, r.updatedAt = $now`,
        { node, permissions: JSON.stringify(next), now },
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

export async function up(_next) {
  await rewriteAdminPermissions((permissions) =>
    permissions.includes(PERMISSION) ? permissions : [...permissions, PERMISSION],
  )
}

export async function down(_next) {
  await rewriteAdminPermissions((permissions) => permissions.filter((p) => p !== PERMISSION))
}

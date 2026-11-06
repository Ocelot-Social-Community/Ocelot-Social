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
      `MATCH (r) WHERE (r:GroupRole OR r:GroupRoleTemplate) AND r.name = $role
       RETURN r.id AS id, r.permissions AS permissions`,
      { role: ROLE },
    )
    const now = new Date().toISOString()
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
      const permissions = parsed as string[]
      const next = transform(permissions)
      if (JSON.stringify(next) === JSON.stringify(permissions)) {
        continue
      }
      await transaction.run(
        // A group role's id is `<groupId>:<name>`, a template role's `<template>:<name>`: unique
        // across both labels.
        `MATCH (r) WHERE (r:GroupRole OR r:GroupRoleTemplate) AND r.id = $id
         SET r.permissions = $permissions, r.updatedAt = $now`,
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

export async function up(_next) {
  await rewriteAdminPermissions((permissions) =>
    permissions.includes(PERMISSION) ? permissions : [...permissions, PERMISSION],
  )
}

export async function down(_next) {
  await rewriteAdminPermissions((permissions) => permissions.filter((p) => p !== PERMISSION))
}

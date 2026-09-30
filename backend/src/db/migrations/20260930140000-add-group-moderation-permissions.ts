import { getDriver } from '@db/neo4j'

export const description =
  'Grant the group moderation rights that ship with the removePostFromGroup feature: group.moderate.any_closed to every role that already holds content.moderate, and additionally group.moderate.any_hidden to roles that administer the network (role.manage) — an unlisted group stays the stricter case. Moderating without reading would be blind, and the read rights were granted by the previous migration. Owner expands to the full catalog and needs no stored entry. Idempotent.'

// Same split as the read rights one migration earlier: closed groups go with moderating,
// hidden ones with administering the network. Derived from what a role already holds, so a
// custom moderation role gains exactly the closed-group right and nothing else.
const FOR_MODERATION = ['group.moderate.any_closed']
const FOR_ADMINISTRATION = ['group.moderate.any_hidden']
const ALL_ADDED = [...FOR_MODERATION, ...FOR_ADMINISTRATION]

// Roles store their permission keys JSON-stringified on the node; Cypher can't append to that
// cleanly, so parse/modify/write back in JS within the migration transaction.
async function rewriteRolePermissions(transform: (permissions: string[]) => string[]) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Owner is protected and stores no permissions (it expands to the full catalog), so only
    // non-protected roles need the explicit grant.
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
        // A corrupt permissions value is an invariant violation (the app always writes valid
        // JSON). Abort loudly rather than silently overwriting it — the surrounding
        // transaction rolls back, so no data is lost.
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
      // Skip the write when nothing changed (idempotent re-runs, untouched roles).
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

const add = (permissions: string[], keys: string[]) =>
  keys.reduce<string[]>((acc, key) => (acc.includes(key) ? acc : [...acc, key]), permissions)

export async function up(_next) {
  await rewriteRolePermissions((permissions) => {
    let next = permissions
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
    permissions.filter((permission) => !ALL_ADDED.includes(permission)),
  )
}

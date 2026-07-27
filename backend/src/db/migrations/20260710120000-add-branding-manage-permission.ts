import { getDriver } from '@db/neo4j'

export const description =
  'Grant the new branding.manage permission to the default admin role, so existing installs can view + switch the active branding from the admin area. Unlike a previously-open capability, this is an admin-only right, so only the admin role receives it (owner expands to the full catalog; moderator/user do not). Idempotent.'

const PERMISSION = 'branding.manage'
const ROLE = 'admin'

// Roles store their permission keys JSON-stringified on the node; parse/modify/write back in JS
// within the migration transaction (Cypher can't append to that cleanly).
async function rewriteAdminPermissions(transform: (permissions: string[]) => string[]) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Only the (non-protected) admin role, if it still exists — it is an optional role that may
    // have been deleted, in which case this is a no-op.
    const result = await transaction.run(
      `MATCH (r:Role {name: $role}) WHERE coalesce(r.protected, false) = false
       RETURN r.id AS id, r.permissions AS permissions`,
      { role: ROLE },
    )
    const now = new Date().toISOString()
    for (const record of result.records) {
      const id = record.get('id') as string
      let parsed: unknown
      try {
        parsed = JSON.parse((record.get('permissions') as string | null) ?? '[]')
      } catch (error) {
        throw new Error(
          `Migration aborted: role ${id} has malformed permissions JSON; fix it manually before re-running. Cause: ${String(error)}`,
        )
      }
      if (!Array.isArray(parsed)) {
        throw new Error(
          `Migration aborted: role ${id} has non-array permissions JSON; fix it manually before re-running.`,
        )
      }
      const permissions = parsed as string[]
      const next = transform(permissions)
      // Idempotent: skip the write when nothing changed (re-runs, already-granted role).
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

export async function up(_next) {
  await rewriteAdminPermissions((permissions) =>
    permissions.includes(PERMISSION) ? permissions : [...permissions, PERMISSION],
  )
}

export async function down(_next) {
  await rewriteAdminPermissions((permissions) => permissions.filter((p) => p !== PERMISSION))
}

import { getDriver } from '@db/neo4j'

export const description =
  'Grant the new comment.create permission to every existing non-owner role, so commenting (previously open to any authenticated member) keeps working after CreateComment becomes permission-gated. Owner expands to the full catalog and needs no stored entry. Idempotent.'

const PERMISSION = 'comment.create'

// Roles store their permission keys JSON-stringified on the node; Cypher can't append
// to that cleanly, so parse/modify/write back in JS within the migration transaction.
async function rewriteRolePermissions(transform: (permissions: string[]) => string[]) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Owner is protected and stores no permissions (it expands to the full catalog),
    // so only non-protected roles need the explicit grant.
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
      } catch (error) {
        // A corrupt permissions value is an invariant violation (the app always writes
        // valid JSON). Abort loudly rather than silently overwriting it with only the
        // new permission — the surrounding transaction rolls back, so no data is lost.
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
      // Skip the write when nothing changed (idempotent re-runs, untouched roles).
      // transform only appends/filters, so order is stable and a serialised compare is exact.
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
  await rewriteRolePermissions((permissions) =>
    permissions.includes(PERMISSION) ? permissions : [...permissions, PERMISSION],
  )
}

export async function down(_next) {
  await rewriteRolePermissions((permissions) => permissions.filter((p) => p !== PERMISSION))
}

import { getDriver } from '@db/neo4j'

export const description =
  'Flatten the group-creation permission into per-type rights mirroring videoCall.create_*: replace the composite `group.create` (which covered public + closed) with `group.create_public` and `group.create_closed`. `group.create_hidden` is unchanged. Behavior-neutral: any role that could create groups keeps creating public + closed groups; the baseline already held all three. Owner expands to the full catalog and needs no stored entry. Idempotent.'

// Roles store their permission keys JSON-stringified on the node; Cypher can't append
// to that cleanly, so parse/modify/write back in JS within the migration transaction.
async function rewriteRolePermissions(transform: (permissions: string[]) => string[]) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    // Owner is protected and stores no permissions (it expands to the full catalog),
    // so only non-protected roles need rewriting.
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

const add = (permissions: string[], key: string) =>
  permissions.includes(key) ? permissions : [...permissions, key]

export async function up(_next) {
  // `group.create` (public + closed) → `group.create_public` + `group.create_closed`,
  // then drop the old key. `group.create_hidden` is left untouched.
  await rewriteRolePermissions((permissions) => {
    if (!permissions.includes('group.create')) return permissions
    let next = add(permissions, 'group.create_public')
    next = add(next, 'group.create_closed')
    return next.filter((p) => p !== 'group.create')
  })
}

export async function down(_next) {
  // Re-collapse the two flat keys back into the composite `group.create`.
  await rewriteRolePermissions((permissions) => {
    if (
      !permissions.includes('group.create_public') &&
      !permissions.includes('group.create_closed')
    ) {
      return permissions
    }
    const next = add(permissions, 'group.create').filter(
      (p) => p !== 'group.create_public' && p !== 'group.create_closed',
    )
    return next
  })
}

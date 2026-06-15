import { getDriver } from '@db/neo4j'

export const description =
  'Grant the new videoCall.create_public permission to every existing non-owner role, preserving parity: public-group video calls (previously open to any member) keep working after opening a call becomes permission-gated. The closed/hidden variants are intentionally NOT granted (opt-in per role). Owner expands to the full catalog and needs no stored entry. Idempotent.'

const PERMISSION = 'videoCall.create_public'

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
      let permissions: string[] = []
      try {
        const parsed: unknown = JSON.parse((record.get('permissions') as string | null) ?? '[]')
        if (Array.isArray(parsed)) permissions = parsed as string[]
      } catch (error) {
        // Malformed JSON ⇒ treat as no permissions; rethrow anything unexpected
        // (mirrors role/repository.ts).
        if (!(error instanceof SyntaxError)) throw error
        permissions = []
      }
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

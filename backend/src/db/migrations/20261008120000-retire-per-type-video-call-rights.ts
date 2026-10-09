import { getDriver } from '@db/neo4j'

export const description =
  'Retire the per-type video call rights. Since 20261004110000-network-group-rights every role that held videoCall.create_public also holds videoCall.create_open, and one that held _closed or _hidden also holds videoCall.create_restricted; the per-type keys stayed only while the webapp still read them. They are removed from every stored role now, and which of them a role held is kept on the role (retiredVideoCallPermissions) for the way back. Down restores exactly those, as far as the role still holds their successor; a role without that record gets videoCall.create_public back from _open and nothing from _restricted, which cannot say whether it stood for closed, hidden or both. Idempotent.'

const RETIRED = ['videoCall.create_public', 'videoCall.create_closed', 'videoCall.create_hidden']

// Which per-door key took over from which per-type one (20261004110000-network-group-rights).
const SUCCESSOR = new Map([
  ['videoCall.create_public', 'videoCall.create_open'],
  ['videoCall.create_closed', 'videoCall.create_restricted'],
  ['videoCall.create_hidden', 'videoCall.create_restricted'],
])

interface RoleRights {
  permissions: string[]
  /** The per-type keys `up` took from this role ([] for none), or null for a role it never saw. */
  retired: string[] | null
}

// Roles store their permission keys JSON-stringified on the node; Cypher can't rewrite that
// cleanly, so parse, change and write back in JS within one transaction.
async function rewriteRolePermissions(transform: (rights: RoleRights) => RoleRights) {
  const driver = getDriver()
  const session = driver.session()
  const transaction = session.beginTransaction()
  try {
    const result = await transaction.run(
      `MATCH (r:Role) WHERE coalesce(r.protected, false) = false
       RETURN r.id AS id, r.permissions AS permissions,
              r.retiredVideoCallPermissions AS retired`,
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
      const storedRetired = record.get('retired') as string | null
      const current: RoleRights = {
        permissions: parsed as string[],
        retired: storedRetired === null ? null : (JSON.parse(storedRetired) as string[]),
      }
      const next = transform(current)
      if (JSON.stringify(next) === JSON.stringify(current)) {
        continue
      }
      // A null `retired` removes the property, as SET does with null.
      await transaction.run(
        `MATCH (r:Role {id: $id})
         SET r.permissions = $permissions, r.retiredVideoCallPermissions = $retired,
             r.updatedAt = $now`,
        {
          id,
          permissions: JSON.stringify(next.permissions),
          retired: next.retired === null ? null : JSON.stringify(next.retired),
          now,
        },
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
  await rewriteRolePermissions(({ permissions, retired }) => {
    const removed = permissions.filter((permission) => RETIRED.includes(permission))
    // Recorded on every role up has seen, empty or not: an empty record says "held none of
    // them", where a missing one would let down fall back to deriving _public.
    return {
      permissions: permissions.filter((permission) => !RETIRED.includes(permission)),
      retired: unique([...(retired ?? []), ...removed]),
    }
  })
}

export async function down(_next) {
  await rewriteRolePermissions(({ permissions, retired }) => {
    // What up took, or — for a role it never saw — the one derivation that is unambiguous.
    const candidates = retired ?? ['videoCall.create_public']
    // Only where the successor is still held: a right taken away since must stay away.
    const restored = candidates.filter((key) => permissions.includes(SUCCESSOR.get(key) ?? ''))
    return { permissions: unique([...permissions, ...restored]), retired: null }
  })
}

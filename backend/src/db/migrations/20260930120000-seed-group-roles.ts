import { getDriver } from '@db/neo4j'
import { DEFAULT_GROUP_ROLE_TEMPLATES, NONE_ROLE } from '@src/groupRole'

import type { GroupRoleDefinition } from '@src/groupRole'

export const description =
  'Give every group its own role definitions. Seeds the network-wide (:GroupRoleTemplate) defaults per group type and copies them into a (:GroupRole) set per existing group, hanging off (:Group)-[:HAS_GROUP_ROLE]->(:GroupRole). The default sets are an audit of the shield guards they replace, so behaviour does not change; the one per-group detail carried over is `showMembers`, which for a closed group becomes group.members.read on its non-member role. Idempotent: every write is ON CREATE, so a re-run adds what is missing and touches nothing that exists.'

const BATCH_SIZE = 500

// Serialised exactly as the repository does, so a role written here and a role written by
// the running backend are indistinguishable.
const toRow = (role: GroupRoleDefinition) => ({
  name: role.name,
  label: role.label ?? null,
  system: role.system,
  protected: role.protected,
  permissions: JSON.stringify(role.permissions),
})

/**
 * The role set for one group: the template for its type, with the one setting that is really
 * a right folded in. A closed group with `showMembers` let non-members see its member list,
 * so that group's `none` role keeps group.members.read — otherwise the upgrade would quietly
 * take a visibility away that the group had switched on.
 */
function rolesForGroup(groupType: string, showMembers: boolean): GroupRoleDefinition[] | null {
  const template = new Map(Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES)).get(groupType)
  if (!template) {
    return null
  }
  return template.map((role) => {
    const permissions = [...role.permissions]
    if (
      role.name === NONE_ROLE &&
      groupType === 'closed' &&
      showMembers &&
      !permissions.includes('group.members.read')
    ) {
      permissions.push('group.members.read')
    }
    return { ...role, permissions }
  })
}

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  const now = new Date().toISOString()
  try {
    const skipped: string[] = []
    let offset = 0
    for (;;) {
      // Captured per iteration: the closure below must not read a variable the loop keeps
      // changing underneath it.
      const skip = offset
      const page = await session.readTransaction(async (transaction) => {
        const result = await transaction.run(
          `MATCH (g:Group)
           RETURN g.id AS id, g.groupType AS groupType, coalesce(g.showMembers, false) AS showMembers
           ORDER BY g.id ASC
           SKIP $offset LIMIT $limit`,
          { offset: skip, limit: BATCH_SIZE },
        )
        return result.records.map((record) => ({
          id: record.get('id') as string,
          groupType: record.get('groupType') as string,
          showMembers: Boolean(record.get('showMembers')),
        }))
      })
      if (page.length === 0) {
        break
      }
      for (const group of page) {
        const roles = rolesForGroup(group.groupType, group.showMembers)
        if (!roles) {
          // A group whose type has no template — only reachable if a type was added to the
          // schema without its template. Recorded and reported instead of aborting the whole
          // migration: the other groups are fine, and this one needs a decision, not a
          // rollback.
          skipped.push(`${group.id} (${group.groupType})`)
          continue
        }
        await session.writeTransaction(async (transaction) => {
          await transaction.run(
            `MATCH (g:Group {id: $groupId})
             UNWIND $roles AS role
             MERGE (g)-[:HAS_GROUP_ROLE]->(r:GroupRole {id: $groupId + ':' + role.name})
             ON CREATE SET r.groupId = $groupId,
                           r.name = role.name,
                           r.label = role.label,
                           r.system = role.system,
                           r.protected = role.protected,
                           r.permissions = role.permissions,
                           r.createdAt = $now,
                           r.updatedAt = $now`,
            { groupId: group.id, roles: roles.map(toRow), now },
          )
        })
      }
      offset += page.length
    }

    // The templates themselves, so the admin area and resetGroupRoles have something to read
    // and a newly created group has something to copy.
    for (const [groupType, roles] of Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES)) {
      await session.writeTransaction(async (transaction) => {
        await transaction.run(
          `UNWIND $roles AS role
           MERGE (r:GroupRoleTemplate {id: $groupType + ':' + role.name})
           ON CREATE SET r.groupType = $groupType,
                         r.name = role.name,
                         r.label = role.label,
                         r.system = role.system,
                         r.protected = role.protected,
                         r.permissions = role.permissions,
                         r.createdAt = $now,
                         r.updatedAt = $now`,
          { groupType, roles: roles.map(toRow), now },
        )
      })
    }

    if (skipped.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `seed-group-roles: no role template for the type of ${String(skipped.length)} group(s): ${skipped.join(', ')}. They have no roles yet — add a template for the type and re-run.`,
      )
    }
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // Drops the definitions, not the memberships: MEMBER_OF.role keeps naming a role, and
    // the names the migration seeded are the ones the pre-migration code understands. A
    // group that renamed a role after migrating would be left with edges pointing at a name
    // the old code does not know — recoverable by renaming it back, which is why this is a
    // warning in the release notes and not a refusal.
    await session.writeTransaction(async (transaction) => {
      await transaction.run(`MATCH (r:GroupRole) DETACH DELETE r`)
      await transaction.run(`MATCH (r:GroupRoleTemplate) DETACH DELETE r`)
      await transaction.run(`MATCH (g:Group) REMOVE g.rolesCustomizedAt`)
    })
  } finally {
    await session.close()
  }
}

// Seeding the network-wide group role templates.
//
// Runs on boot (and from the seeding CLI), not only in the migration: a fresh install has no
// migration history to replay, and `db:reset` wipes the templates along with everything else.
// Every write is ON CREATE, so an operator's edit to a template is never reverted by a restart
// — the same edit-respecting seeding the network roles use.
import { DEFAULT_GROUP_ROLE_TEMPLATES, MANDATORY_GROUP_ROLE_NAMES } from './defaults'
import { readGroupRoleTemplates, seedGroupRoleTemplate } from './repository'

import type { GroupRoleTemplates } from './types'
import type databaseContext from '@context/database'

type DbContext = ReturnType<typeof databaseContext>

/**
 * Ensure every shipped template exists, and hand back what is persisted.
 *
 * Throws when a template ends up without its system roles: a group created from such a
 * template would have no `none`, `pending` or `owner` role, which means nobody could look at
 * it and nobody could administer it. Failing at boot is better than serving that.
 */
export async function seedGroupRoleTemplates(
  db: DbContext,
  now: string = new Date().toISOString(),
): Promise<GroupRoleTemplates> {
  for (const [visibility, roles] of Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES)) {
    for (const role of roles) {
      await seedGroupRoleTemplate(db, visibility, role, now)
    }
  }
  const persisted = await readGroupRoleTemplates(db)
  const persistedByType = new Map(Object.entries(persisted))
  const incomplete = Object.keys(DEFAULT_GROUP_ROLE_TEMPLATES).filter((visibility) => {
    const names = new Set((persistedByType.get(visibility) ?? []).map((role) => role.name))
    return MANDATORY_GROUP_ROLE_NAMES.some((name) => !names.has(name))
  })
  if (incomplete.length > 0) {
    throw new Error(
      `seedGroupRoleTemplates: incomplete template(s) ${incomplete.join(
        ', ',
      )} — the system roles (${MANDATORY_GROUP_ROLE_NAMES.join(
        ', ',
      )}) must exist. Refusing to continue: groups created from such a template would have no roles.`,
    )
  }
  return persisted
}

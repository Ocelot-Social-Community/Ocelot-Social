import { getDriver } from '@db/neo4j'

export const description =
  'Groups run on role templates: what a group was created from moves from `Group.groupType` to `Group.template`, and `groupType` goes — how findable a group is is derived from the rights of its non-member role now (groupRole/privacyLevel.ts), not stored. Writes no roles: the boot seeds the templates (seedGroupRoleTemplates) and gives every group without roles the ones of its template (seedRolesForGroupsWithoutRoles), which also writes the access columns from them and carries a closed group`s `showMembers` over. Until then the columns are filled from `groupType` here, so no group reads as unlisted in between. Idempotent.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // The template first, so no group loses track of what it was created from.
    await session.run(`MATCH (g:Group) WHERE g.template IS NULL AND g.groupType IS NOT NULL
                       SET g.template = g.groupType`)
    // The columns the visibility and the door are read from, until the boot seeds the roles and
    // writes them from those. `showMembers` is kept where it was set: it is what a closed group's
    // non-member role is given on that boot.
    await session.run(`MATCH (g:Group)
                       WHERE g.nonMemberRead IS NULL
                       SET g.nonMemberRead = coalesce(g.groupType, 'hidden') <> 'hidden',
                           g.nonMemberContentRead = coalesce(g.groupType, 'hidden') = 'public',
                           g.nonMemberJoin = coalesce(g.groupType, 'hidden') = 'public',
                           g.showMembers = coalesce(g.showMembers, coalesce(g.groupType, 'hidden') = 'public')`)
    await session.run(`MATCH (g:Group) REMOVE g.groupType`)
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // Readable again as it was: the visibility the rights derive to, written back into the
    // property that used to hold it.
    await session.run(`MATCH (g:Group)
                       SET g.groupType = CASE
                         WHEN coalesce(g.nonMemberRead, false) <> true THEN 'hidden'
                         WHEN coalesce(g.nonMemberContentRead, false) <> true THEN 'closed'
                         ELSE 'public'
                       END`)
  } finally {
    await session.close()
  }
}

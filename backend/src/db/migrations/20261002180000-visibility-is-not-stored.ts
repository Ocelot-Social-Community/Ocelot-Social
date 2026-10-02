import { getDriver } from '@db/neo4j'

export const description =
  'Stop storing what is derived, start storing what is not. `Group.groupType` was two things in one property: how findable the group is — which follows from `nonMemberRead` / `nonMemberContentRead`, two columns already on the node — and which role template it was created from, which nothing derives. The first becomes an expression (`visibilityOf` in graphql/resolvers/helpers/groupAccessCypher.ts, `privacyLevelFrom` in TS) and the property goes; the second moves to `Group.template`. A group whose columns were never written reads as unlisted until the boot repair seeds its roles, which is the safe arm. Idempotent.'

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // The template first, so no group loses track of what it was created from.
    await session.run(`MATCH (g:Group) WHERE g.template IS NULL AND g.groupType IS NOT NULL
                       SET g.template = g.groupType`)
    // Then the columns the visibility is read from, for any row the earlier backfill missed.
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

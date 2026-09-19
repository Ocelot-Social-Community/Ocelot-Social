import { getDriver } from '@db/neo4j'

import type { Session } from 'neo4j-driver'

export const description = `
  Delete NOTIFIED edges that announce a post in a non-public group to someone who is not a
  member of it.

  These should never have existed. \`notifyFollowingUsers\` took the post's group from
  \`args.groupId\` — an argument CreatePost declares and UpdatePost does not (see Post.gql),
  while ONE middleware handler served both. So on an edit the group arrived as null, the
  OPTIONAL MATCH bound nothing, \`group IS NULL\` was true, and the filter that exists to keep
  hidden groups hidden fell open: every follower of the author was notified about a post inside
  a closed or hidden group. Editing a typo in a months-old post was enough to trigger it.

  WHAT LEAKED

  Not just the existence of a post. A notification carries its title, its author and its group
  name — the webapp renders all three in the bell — so a follower outside the group learned what
  the group is called and who posts what in it. The link then led nowhere, because every post
  query does apply the visibility rule. That mismatch is how this was found.

  WHAT IS DELETED

  A NOTIFIED edge whose resource is a post (or a comment on a post) in a group with
  \`groupType <> 'public'\`, where the recipient holds no active membership of that group.
  That is each notifier's OWN rule, applied after the fact:

    notifyFollowingUsers        public group or no group at all
    notifyGroupMembersOfNewPost membership.role <> 'pending'
    notifyUsersOfMention        membership.role IN ['usual', 'admin', 'owner']

  Membership is asked of the graph rather than the materialised \`CANNOT_SEE\` edge, on purpose.
  CANNOT_SEE is what the READ path filters on, and filtering on it here would make the cleanup
  agree with the read path by construction — including wherever the two have drifted apart.
  Membership is the fact both are derived from.

  A pending membership is not a membership: \`post_in_group\` excludes it, and a pending member
  cannot open the group's posts either.

  WHAT IS KEPT

  Everything about posts outside a group, posts in public groups, and every notification to an
  actual member. Group notifications (\`user_joined_group\` and friends) attach to the Group
  node, not to a post, and are not touched.

  Deleting rather than hiding: the read path now filters these out as well (see
  graphql/resolvers/notifications.ts), so leaving them would be invisible but not harmless — the
  rows stay in every backup and in any future reader that forgets the filter, and they are the
  one thing this bug produced that has no legitimate reading.

  Idempotent: a second run finds nothing to do. Not reversible — see \`down\`.
`

// Comments hang off their post, so a comment is as unreachable as the post carrying it —
// `coalesce` reads both cases as "the post whose visibility decides this", and the label guard
// drops the notifications that attach to a Group node instead.
//
// One fragment for counting and deleting, so "what is reported" and "what is removed" cannot
// come apart. Every step stays connected to the one before it: matching the post independently
// and joining on `post = resource` would be a cartesian product over every Post in the database.
const AFFECTED = `
  MATCH (resource)-[notification:NOTIFIED]->(recipient:User)
  OPTIONAL MATCH (resource)-[:COMMENTS]->(commentedOn:Post)
  WITH notification, recipient, coalesce(commentedOn, resource) AS post
    WHERE 'Post' IN labels(post)
  MATCH (post)-[:IN]->(group:Group)
    WHERE NOT group.groupType = 'public'
      AND NOT EXISTS {
        MATCH (group)<-[membership:MEMBER_OF]-(recipient)
        WHERE membership.role IN ['usual', 'admin', 'owner']
      }
`

interface Summary {
  group: string
  groupType: string
  notifications: number
}

/**
 * What is about to go, grouped by the group whose privacy it broke.
 *
 * Per group, not per recipient. The counts are what an operator needs — "this hidden group was
 * announced 40 times to non-members" is the sentence they have to be able to say to its owner —
 * and a list of who received what would put exactly the association this migration is deleting
 * into a deployment log, which outlives the database rows and travels further than they do.
 */
const summarise = async (session: Session): Promise<Summary[]> => {
  const result = await session.readTransaction((transaction) =>
    transaction.run(`
      ${AFFECTED}
      RETURN group.slug AS group, group.groupType AS groupType, count(notification) AS notifications
      ORDER BY notifications DESC
    `),
  )
  return result.records.map((record) => ({
    group: String(record.get('group') ?? 'no slug'),
    groupType: String(record.get('groupType')),
    notifications: (record.get('notifications') as { toNumber: () => number }).toNumber(),
  }))
}

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    const summaries = await summarise(session)
    const total = summaries.reduce((sum, { notifications }) => sum + notifications, 0)

    /* eslint-disable no-console */
    // Printed BEFORE the delete, because `down` cannot put these back and a run killed partway
    // through would otherwise leave no record of what it had already removed.
    console.log(`Notifications about invisible posts: ${String(total)} to delete`)
    for (const { group, groupType, notifications } of summaries) {
      console.log(`  ${group} (${groupType}): ${String(notifications)}`)
    }

    if (total > 0) {
      await session.writeTransaction((transaction) =>
        transaction.run(`
          ${AFFECTED}
          DELETE notification
        `),
      )
    }

    console.log('Notifications about invisible posts: done')
    /* eslint-enable no-console */
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Deliberately empty. The previous state is "people hold notifications about posts they are
  // not allowed to read", which is the bug, not a state worth reconstructing. Recreating the
  // edges would also have to invent their `createdAt` and `read`, neither of which survives the
  // delete — a restore that made up when someone was told something would be worse than none.
  await Promise.resolve()
}

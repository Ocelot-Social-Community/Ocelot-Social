import { getDriver } from '@db/neo4j'

export const description = `
  Keep one notification per post and recipient: delete the NOTIFIED edges a more specific one
  on the same post outranks.

  Each announcer of a new post used to MERGE its own edge, so a follower of the author who was
  also a member of the group — or was mentioned — found the same post two or three times in
  their bell. The middleware now writes the most specific reason only (see handleCreatePost):

    mentioned_in_post  >  post_in_group  >  followed_user_posted

  This applies the same ranking to the edges written before it. The kept edge keeps its own
  \`read\` and \`createdAt\`: it is the one the recipient was going to see anyway.

  Idempotent: a second run finds nothing to do. Not reversible — see \`down\`.
`

// An edge is outranked when the same post told the same recipient for a reason further left in
// the ranking. The position is read off the list rather than spelled out pairwise, so the two
// cannot disagree.
const RANKING = ['mentioned_in_post', 'post_in_group', 'followed_user_posted']

const OUTRANKED = `
  MATCH (post:Post)-[outranked:NOTIFIED]->(recipient:User)
    WHERE outranked.reason IN $ranking
  MATCH (post)-[higher:NOTIFIED]->(recipient)
    WHERE higher.reason IN $ranking
  WITH outranked, higher,
    [i IN range(0, size($ranking) - 1) WHERE $ranking[i] = outranked.reason][0] AS outrankedRank,
    [i IN range(0, size($ranking) - 1) WHERE $ranking[i] = higher.reason][0] AS higherRank
    WHERE higherRank < outrankedRank
  WITH DISTINCT outranked
`

export async function up(_next) {
  const session = getDriver().session()
  try {
    const result = await session.writeTransaction((transaction) =>
      transaction.run(
        `
          ${OUTRANKED}
          DELETE outranked
          RETURN count(*) AS deleted
        `,
        { ranking: RANKING },
      ),
    )
    const deleted = (result.records[0].get('deleted') as { toNumber: () => number }).toNumber()
    // eslint-disable-next-line no-console
    console.log(`Outranked post notifications deleted: ${String(deleted)}`)
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Deliberately empty. The deleted edges said what the kept one already says about the same
  // post, and recreating them would have to invent their `read` and `createdAt`.
  await Promise.resolve()
}

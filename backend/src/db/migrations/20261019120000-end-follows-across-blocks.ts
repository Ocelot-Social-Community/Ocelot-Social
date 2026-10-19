import { getDriver } from '@db/neo4j'

export const description =
  "End following across a block, in both directions: blockUser used to delete only the blocker's own FOLLOWS, so a blocked user kept following the one who blocked them. Each deleted edge is remembered on the BLOCKED edge (with its createdAt) so down restores it. Idempotent."

// One statement per direction rather than an undirected match: which side followed is what down
// has to know, and it is the property name that records it.
export async function up(_next) {
  const session = getDriver().session()
  try {
    await session.writeTransaction(async (transaction) => {
      await transaction.run(`
        MATCH (blocker:User)-[block:BLOCKED]->(blocked:User)-[follows:FOLLOWS]->(blocker)
        SET block.blockedFollowedSince = coalesce(follows.createdAt, toString(datetime()))
        DELETE follows
      `)
      await transaction.run(`
        MATCH (blocked:User)<-[block:BLOCKED]-(blocker:User)-[follows:FOLLOWS]->(blocked)
        SET block.blockerFollowedSince = coalesce(follows.createdAt, toString(datetime()))
        DELETE follows
      `)
    })
  } finally {
    await session.close()
  }
}

// Restores what up deleted, as far as the block still stands: an unblock deletes the BLOCKED
// edge and with it the memory of the follow — the same follow an unblock after the fix no longer
// brings back either.
export async function down(_next) {
  const session = getDriver().session()
  try {
    await session.writeTransaction(async (transaction) => {
      await transaction.run(`
        MATCH (blocker:User)-[block:BLOCKED]->(blocked:User)
        WHERE block.blockedFollowedSince IS NOT NULL
        MERGE (blocked)-[follows:FOLLOWS]->(blocker)
        ON CREATE SET follows.createdAt = block.blockedFollowedSince
        REMOVE block.blockedFollowedSince
      `)
      await transaction.run(`
        MATCH (blocker:User)-[block:BLOCKED]->(blocked:User)
        WHERE block.blockerFollowedSince IS NOT NULL
        MERGE (blocker)-[follows:FOLLOWS]->(blocked)
        ON CREATE SET follows.createdAt = block.blockerFollowedSince
        REMOVE block.blockerFollowedSince
      `)
    })
  } finally {
    await session.close()
  }
}

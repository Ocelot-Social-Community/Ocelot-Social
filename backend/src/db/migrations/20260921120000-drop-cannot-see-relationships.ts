import { getDriver } from '@db/neo4j'

import type { Session, Transaction } from 'neo4j-driver'

/**
 * Relationships deleted per transaction.
 *
 * The edge count is `posts in non-public groups × users who are not members`, so it is the one
 * quantity in this database that grows as a product of two growing things. Measured on a
 * synthetic instance of 20.000 posts and 2.000 users it was 11,2 million — and `DETACH DELETE`
 * in one transaction would have to hold every one of them in the transaction state.
 *
 * 100.000 keeps a batch well inside a default heap while still being large enough that the
 * per-transaction overhead does not dominate. A full delete of 11,2 million took ~6.5 minutes
 * at half a million per batch; the smaller batch trades some of that for headroom on an
 * instance that is also serving traffic.
 */
const BATCH_SIZE = 100000

export const description = `
  Delete every \`(:User)-[:CANNOT_SEE]->(:Post)\` relationship.

  CANNOT_SEE was a materialised negative ACL: for each post in a closed or hidden group it
  stored one edge to every user who was not a member, and five separate mutations kept those
  edges in step with the group (CreatePost, SignupVerification, UpdateGroup, ChangeGroupMemberRole,
  LeaveGroup/RemoveUserFromGroup).

  The rule it encoded is now read off the group at query time — a post in a non-public group is
  visible to active members and to its own author — so the edges are not consulted any more. The
  read path was the reason to remove them, not just the storage: the visibility check traversed
  each post's CANNOT_SEE chain, whose length is the number of non-members, so every feed request
  got slower as the network gained users. Profiled over 20.000 posts, the same query cost
  3.551.945 db hits at 1.000 users, 9.142.613 at 2.000, and 124.395 at either size once the rule
  came from the group.

  The relationship only ever existed because neo4j-graphql-js could not filter across a
  relation; that library is gone.

  There is no \`down\`. See the note on it below.
`

/**
 * Deletes up to `batchSize` relationships and reports how many it got.
 *
 * Exported for the spec, which runs it against a real Neo4j with a batch size small enough to
 * need several rounds. Both defects this function has had are invisible to a mocked driver —
 * one was the parameter's Cypher TYPE, the other the return value's — so a fake session that
 * accepts any query and returns any number would have passed while `db:migrate up` died.
 */
export const deleteBatch = async (session: Session, batchSize: number): Promise<number> => {
  const result = await session.writeTransaction((transaction: Transaction) =>
    transaction.run(
      // `toInteger($batchSize)`, not a bare `$batchSize`. The driver sends a plain JS number
      // as a Cypher Float, and LIMIT rejects that outright: "'100000.0' is not a valid value.
      // Must be a non-negative integer." Same reason pagingClause writes
      // `SKIP toInteger($offset) LIMIT toInteger($first)`.
      `
        MATCH ()-[restriction:CANNOT_SEE]->()
        WITH restriction LIMIT toInteger($batchSize)
        DELETE restriction
        RETURN count(restriction) AS deleted
      `,
      { batchSize },
    ),
  )
  // Neo4j returns counts as its own Integer type, which is not a JS number and compares
  // false against one. `> 0` on the raw value would end the loop on the first batch.
  return (result.records[0].get('deleted') as { toNumber: () => number }).toNumber()
}

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    let deleted: number
    do {
      deleted = await deleteBatch(session, BATCH_SIZE)
    } while (deleted > 0)
  } finally {
    await session.close()
  }
}

/**
 * Deliberately a no-op.
 *
 * Rebuilding the edges is mechanically possible — they are a pure function of the group graph —
 * but the reconstruction would not be the data that was deleted. The stored set was
 * path-dependent: whether a user kept seeing their own post after losing membership had three
 * different answers depending on whether they left, were removed, or were demoted, because the
 * author exception existed in only one of those three code paths. Any `down` has to pick one
 * answer and would hand the rolled-back code a set it never would have written itself.
 *
 * Rolling back past this migration therefore needs a rebuild run against the restored code, not
 * a reversal here. Leaving `down` empty says that out loud; throwing would block an otherwise
 * fine rollback of the migrations around it.
 */
export async function down(_next) {
  // intentionally empty — see the comment above
}

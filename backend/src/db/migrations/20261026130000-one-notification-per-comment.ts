import { getDriver } from '@db/neo4j'

export const description = `
  Keep one notification per comment and recipient: delete \`commented_on_post\` where the same
  comment also mentioned the recipient.

  An observer of a post who was mentioned in a comment on it found that comment twice in their
  bell, once per reason. The middleware now writes the mention only (see
  handleContentDataOfComment); this applies the same rule to the edges written before. The
  mention keeps its own \`read\` and \`createdAt\`.

  Idempotent: a second run finds nothing to do. Not reversible — see \`down\`.
`

export async function up(_next) {
  const session = getDriver().session()
  try {
    const result = await session.writeTransaction((transaction) =>
      transaction.run(`
        MATCH (comment:Comment)-[outranked:NOTIFIED { reason: 'commented_on_post' }]->(recipient:User)
        WHERE EXISTS {
          MATCH (comment)-[:NOTIFIED { reason: 'mentioned_in_comment' }]->(recipient)
        }
        DELETE outranked
        RETURN count(*) AS deleted
      `),
    )
    const deleted = (result.records[0].get('deleted') as { toNumber: () => number }).toNumber()
    // eslint-disable-next-line no-console
    console.log(`Outranked comment notifications deleted: ${String(deleted)}`)
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Deliberately empty. The deleted edges said what the mention already says about the same
  // comment, and recreating them would have to invent their `read` and `createdAt`.
  await Promise.resolve()
}

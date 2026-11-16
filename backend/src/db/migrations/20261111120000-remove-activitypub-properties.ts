import { getDriver } from '@db/neo4j'

export const description = `
  Remove the properties ActivityPub left behind: User.actorId, User.publicKey, User.privateKey,
  Post.activityId, Post.objectId and Comment.activityId.

  Nothing has written them since ActivityPub was removed (#10641), and the GraphQL fields that
  read them were deprecated (#10734) and are now gone (#10735). \`privateKey\` was never exposed,
  but it is key material and must not stay in the database.

  Idempotent: a second run finds nothing to remove. Not reversible — see \`down\`.
`

// One statement per label and property, so each count says what it removed.
const PROPERTIES: { label: 'User' | 'Post' | 'Comment'; property: string }[] = [
  { label: 'User', property: 'actorId' },
  { label: 'User', property: 'publicKey' },
  { label: 'User', property: 'privateKey' },
  { label: 'Post', property: 'activityId' },
  { label: 'Post', property: 'objectId' },
  { label: 'Comment', property: 'activityId' },
]

export async function up(_next) {
  const session = getDriver().session()
  try {
    for (const { label, property } of PROPERTIES) {
      // Label and property come from the constant above, not from input.
      const result = await session.writeTransaction((transaction) =>
        transaction.run(`
          MATCH (node:${label}) WHERE node.${property} IS NOT NULL
          REMOVE node.${property}
          RETURN count(node) AS removed
        `),
      )
      const removed = (result.records[0].get('removed') as { toNumber: () => number }).toNumber()
      // eslint-disable-next-line no-console
      console.log(`${label}.${property} removed from ${String(removed)} nodes`)
    }
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  // Deliberately empty. The values were dead ActivityPub data, and the private keys are exactly
  // what must not come back.
  await Promise.resolve()
}

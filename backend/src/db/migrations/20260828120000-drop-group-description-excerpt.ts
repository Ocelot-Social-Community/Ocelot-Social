import { getDriver } from '@db/neo4j'

export const description = `
  Remove the \`descriptionExcerpt\` property from every Group node.

  The excerpt was a stored copy of the first ~250 characters of \`description\`, written by
  excerptMiddleware on CreateGroup/UpdateGroup and read in exactly one place: the group teaser
  card. It never paid for itself. Every query that asked for it also asked for \`description\`
  in the same selection set, so it saved no payload; it was not part of the group fulltext
  index (\`["name","slug","about","description"]\`, migration 20220803060819), so it bought no
  search either. What it did cost is a second copy of the same text on every node, kept in
  sync by a middleware, sanitised by a second xss rule, and able to drift from its source.

  The cut now happens in the webapp, with trunc-html at the same
  \`branding.group.descriptionExcerptLength\` — the same function at the same length, one step
  later, where the result is actually rendered.

  This migration is REQUIRED, not cosmetic: db/schema/entities/Group.ts no longer declares the
  property, and the schema is compiled with \`additionalProperties: false\`. A node still
  carrying the leftover key is a node the read path rejects.
`

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    await session.writeTransaction((transaction) =>
      transaction.run(`
        MATCH (group:Group)
        WHERE group.descriptionExcerpt IS NOT NULL
        REMOVE group.descriptionExcerpt
      `),
    )
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // Reconstructed from the description rather than restored: the original value is gone, and
    // this is what excerptMiddleware would have written for the same text. Not byte-identical
    // — trunc-html closes tags at the cut, which Cypher's substring cannot — but the property
    // is back, populated and of the right order of magnitude, which is what `down` owes a
    // schema that expects it to exist.
    await session.writeTransaction((transaction) =>
      transaction.run(`
        MATCH (group:Group)
        WHERE group.description IS NOT NULL
        SET group.descriptionExcerpt = substring(group.description, 0, 250)
      `),
    )
  } finally {
    await session.close()
  }
}

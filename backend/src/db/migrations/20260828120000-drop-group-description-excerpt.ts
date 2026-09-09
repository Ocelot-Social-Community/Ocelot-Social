import { getDriver } from '@db/neo4j'

/**
 * The length every excerpt in an existing database was cut at.
 *
 * A hard constant on purpose, not `branding.group.descriptionExcerptLength`. A migration is a
 * frozen artifact: running `down` on the same database today and in a year has to produce the
 * same rows, and reading live config breaks that. The branding key is also read by exactly one
 * webapp computed now, which makes it a plausible thing for someone to delete later — and it
 * would take this migration with it.
 *
 * 250 is not an arbitrary pick. It was `DESCRIPTION_EXCERPT_HTML_LENGTH` in
 * backend/src/constants/groups.ts and hardcoded for the whole life of the data up to the
 * branding package (507ad70509, 2026-07-14); it is still the framework default. Only a brand
 * that raised the value since then gets a shorter excerpt back than it wrote — cosmetic, on the
 * teaser card, until the group is next saved. That is the trade this constant accepts, and it
 * is smaller than a migration whose output depends on when it runs.
 */
const HISTORIC_EXCERPT_LENGTH = 250

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
    // is back, populated and of the right length, which is what `down` owes a schema that
    // expects it to exist. It cannot be empty: the code being rolled back to declares
    // `descriptionExcerpt: String!`, so a missing property is a non-null field returning null.
    //
    // A description shorter than the cut is the common case, and substring clamps rather than
    // throwing there — verified against Neo4j 4.4: substring('hello', 0, 250) => 'hello'.
    await session.writeTransaction((transaction) =>
      transaction.run(
        `
        MATCH (group:Group)
        WHERE group.description IS NOT NULL
        SET group.descriptionExcerpt = substring(group.description, 0, $length)
      `,
        { length: HISTORIC_EXCERPT_LENGTH },
      ),
    )
  } finally {
    await session.close()
  }
}

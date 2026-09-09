import { getDriver } from '@db/neo4j'

import type { Session } from 'neo4j-driver'

export const description = `
  Drop the uniqueness constraints on the secondary label :Article.

  A post carries two labels: (:Post:Article) or (:Post:Event). The Article ones exist because
  db/neo4j.ts calls neode's extend('Post', 'Article'), which derives a SECOND model from Post's
  schema — so schema.install() emitted Post's \`id: primary\` and \`slug: unique\` twice, once per
  label. extend was never called for Event, so the two secondary labels are treated unequally
  for no reason anyone can name.

  The Article constraints cannot ever fire. A uniqueness constraint is per label, and every
  Article node also carries Post (the only label sets in a seeded database are ["Post","Article"]
  and ["Post","Event"]), so Post(id)/Post(slug) already rejects everything Article(id)/Article(slug)
  would. What they do cost is a second index to maintain on every post write — the hottest write
  path there is.

  Constraints therefore live on the PRIMARY label only; secondary labels are markers (see
  \`alsoLabelled\` in db/schema/types.ts). This resolves the asymmetry by removing the extra pair
  rather than by adding one for Event.

  Dropped by definition, not by name: the names are generated per database (constraint_680d649a
  and constraint_dc463a88 in one instance, different in the next), so the migration looks up
  the constraints on :Article and drops those. Only the two it can put back, though — the
  uniqueness constraints on \`id\` and \`slug\`. Anything else on that label is left alone,
  because \`down\` could not rebuild it and a migration must not destroy more than it restores.

  NOTE — until neode is gone, a fresh \`db:migrate init\` recreates them: store.ts still calls
  schema.install(), which still walks the extended model. The schema layer's drift check reports
  them as SURPLUS, which is the reminder. They stop coming back when the DDL comes from
  db/schema instead (concept stage P2).
`

/** One row of `SHOW CONSTRAINTS`, in the column shape 4.4 reports. */
export interface PresentConstraint {
  readonly labelsOrTypes: string[] | null
  readonly type: string
  readonly properties: string[] | null
}

/**
 * Whether this migration may drop a constraint — which is to say, whether `down` could put it
 * back.
 *
 * Article-only was the whole test at first, and `up` then dropped everything it found while
 * `down` recreated exactly two things: the uniqueness constraints on `id` and `slug`. Anything
 * else sitting on :Article — an existence constraint someone added by hand, a uniqueness one
 * over another property — was destroyed permanently by a migration that presents itself as
 * reversible. A migration may only remove what its own `down` rebuilds; the two halves are one
 * statement, and this is the half that says it.
 *
 * The pair is named rather than pattern-matched because it is a closed set: neode's
 * `extend('Post', 'Article')` copied Post's `id: primary` and `slug: unique`, and nothing else
 * ever generated a constraint on this label.
 */
export const isReversible = (constraint: PresentConstraint): boolean => {
  const { labelsOrTypes, type, properties } = constraint
  if (labelsOrTypes?.length !== 1 || labelsOrTypes[0] !== 'Article') {
    return false
  }
  if (type !== 'UNIQUENESS') {
    return false
  }
  return properties?.length === 1 && ['id', 'slug'].includes(properties[0])
}

const constraintsOnArticle = async (session: Session): Promise<string[]> => {
  const result = await session.run('SHOW CONSTRAINTS')
  return result.records
    .filter((record) =>
      isReversible({
        labelsOrTypes: record.get('labelsOrTypes') as string[] | null,
        type: String(record.get('type')),
        properties: record.get('properties') as string[] | null,
      }),
    )
    .map((record) => String(record.get('name')))
}

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    for (const name of await constraintsOnArticle(session)) {
      // Schema statements cannot share a transaction in community edition, so each runs alone.
      await session.run(`DROP CONSTRAINT ${name} IF EXISTS`)
    }
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // Recreated under explicit names rather than the generated ones they had before — the
    // definition is what matters, and IF NOT EXISTS recognises an equivalent constraint
    // whatever it is called.
    await session.run(
      'CREATE CONSTRAINT Article_id_unique IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE',
    )
    await session.run(
      'CREATE CONSTRAINT Article_slug_unique IF NOT EXISTS FOR (a:Article) REQUIRE a.slug IS UNIQUE',
    )
  } finally {
    await session.close()
  }
}

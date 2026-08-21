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
  whatever UNIQUENESS constraints sit on :Article and drops those.

  They no longer come back. \`db:migrate init\` used to recreate them via neode's
  schema.install(), which walked the extended model; store.ts now applies the declaration in
  db/schema, and that emits constraints for PRIMARY labels only (see \`alsoLabelled\` in
  db/schema/types.ts). If run-audit.ts reports them as SURPLUS again, this migration is the
  answer — not re-adding them to the declaration.
`

/**
 * The UNIQUENESS constraints on the secondary label :Article.
 *
 * Narrowed by type, not just by label: `down()` recreates exactly two uniqueness constraints,
 * so anything else this dropped would be gone for good. An existence or key constraint on
 * :Article is not what neode's `extend` produced and not what this migration is about — an
 * operator who added one meant it, and a migration that silently removed it would take a
 * database guarantee with it.
 *
 * A record without a `type` column is left alone for the same reason: `SHOW CONSTRAINTS`
 * reports one on Neo4j 4.4 (verified: `id, name, type, entityType, labelsOrTypes, properties,
 * ownedIndexId`), but where the answer is unknown, not dropping is the safe direction.
 */
const constraintsOnArticle = async (session: Session): Promise<string[]> => {
  const result = await session.run('SHOW CONSTRAINTS')
  return result.records
    .filter((record) => {
      const labels = record.get('labelsOrTypes') as string[] | null
      const onArticle = labels?.length === 1 && labels[0] === 'Article'
      return onArticle && record.has('type') && String(record.get('type')) === 'UNIQUENESS'
    })
    .map((record) => String(record.get('name')))
}

/**
 * `DROP CONSTRAINT` for one name.
 *
 * The name is a Cypher IDENTIFIER, not a parameter — no `$name` can stand here. Backticks
 * because the generated names (`constraint_680d649a`) are not the only ones this can meet: a
 * constraint an operator created as `` `article-legacy` `` is a syntax error unquoted. An
 * inner backtick is escaped by doubling it, which is Cypher's own rule for quoted identifiers.
 */
const dropStatement = (name: string): string =>
  `DROP CONSTRAINT \`${name.replace(/`/g, '``')}\` IF EXISTS`

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    for (const name of await constraintsOnArticle(session)) {
      // Schema statements cannot share a transaction in community edition, so each runs alone.
      await session.run(dropStatement(name))
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

import { getDriver } from '@db/neo4j'

import type { Session } from 'neo4j-driver'

export const description = `
  Make Room.id and Message.id unique, replacing the plain indices on them.

  Both labels came from the chat resolvers and never had a neode model, so they never had a
  constraint either — only the indices added by 20260817120000-add-room-and-message-indices.
  The ids come from apoc.create.uuid() and every lookup treats them as identities
  (MATCH (m:Message { id: … })), so uniqueness is what was always meant.

  RELEASE 1 OF 2. The declaration in db/schema still says \`indexed\`, not \`unique\`, and that is
  deliberate — Neo4j 4.4 refuses a uniqueness constraint while a plain index on the same
  label/property exists:

    There already exists an index (:Message {id}). A constraint cannot be created until the
    index has been dropped.

  \`IF NOT EXISTS\` does not help: it guards against an existing CONSTRAINT. And the conflict
  cannot be prepared for from a migration alone, because the init container runs
  \`prod:migrate init && prod:migrate up\` — the declaration is applied BEFORE any migration,
  and applyPlan() creates indices before constraints within that run. Declaring \`unique\` today
  would therefore make init emit a statement the server rejects; it lands in \`failed\`, and
  \`enforce\` throws on that in BOTH enforcement modes, production included.

  So this migration does the switch, and the declaration follows in the next release, where
  \`CREATE CONSTRAINT … IF NOT EXISTS\` finds the constraint already in place and does nothing.
  Until then the drift check reports the two constraints as SURPLUS. That is expected for one
  release and is the reason this note exists.

  \`id\` is removed from \`indexed\` in the same release as this migration, so init stops
  recreating a plain index that the constraint's own index makes redundant. (4.4 does allow
  both to coexist — verified — but that is a second index to maintain on the fastest growing
  labels there are.)

  Duplicates are counted BEFORE anything is dropped: a constraint that then fails would leave
  the label with no index at all. Aborting early leaves the database exactly as it was.
`

const LABELS = ['Room', 'Message'] as const

/**
 * Plain indices on `(label).id`, by name.
 *
 * By definition rather than by name, as in 20260820140000: the same index exists under
 * `room_id` where 20260817120000 created it and under `Room_id_index` where the declaration's
 * apply path did. `uniqueness = 'NONUNIQUE'` excludes an index BACKING a constraint — 4.4
 * reports those in SHOW INDEXES too, and dropping one directly is refused.
 */
const plainIdIndices = async (session: Session, label: string): Promise<string[]> => {
  const result = await session.run('SHOW INDEXES')
  return result.records
    .filter((record) => {
      const labels = (record.get('labelsOrTypes') as string[] | null) ?? []
      const properties = (record.get('properties') as string[] | null) ?? []
      return (
        labels.length === 1 &&
        labels[0] === label &&
        properties.length === 1 &&
        properties[0] === 'id' &&
        record.has('uniqueness') &&
        String(record.get('uniqueness')) === 'NONUNIQUE'
      )
    })
    .map((record) => String(record.get('name')))
}

/** Backticks because an index name is an identifier, not a parameter; inner ones are doubled. */
const quoted = (name: string): string => `\`${name.replace(/`/g, '``')}\``

const duplicateIds = async (session: Session, label: string): Promise<number> => {
  const result = await session.run(
    `MATCH (n:${label}) WHERE n.id IS NOT NULL
     WITH n.id AS id, count(*) AS nodes WHERE nodes > 1
     RETURN count(id) AS duplicates`,
  )
  const value: unknown = result.records[0]?.get('duplicates')
  return Number((value as { toString: () => string } | null)?.toString() ?? 0)
}

export async function up(_next) {
  const session = getDriver().session()
  try {
    for (const label of LABELS) {
      const duplicates = await duplicateIds(session, label)
      if (duplicates > 0) {
        throw new Error(
          `${label}.id cannot be made unique: ${String(duplicates)} id(s) occur more than once. ` +
            `Clean them up first — nothing has been changed by this migration.`,
        )
      }
    }
    for (const label of LABELS) {
      // Schema statements cannot share a transaction in community edition, so each runs alone.
      for (const name of await plainIdIndices(session, label)) {
        await session.run(`DROP INDEX ${quoted(name)} IF EXISTS`)
      }
      await session.run(
        `CREATE CONSTRAINT ${label}_id_unique IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`,
      )
    }
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const session = getDriver().session()
  try {
    for (const label of LABELS) {
      await session.run(`DROP CONSTRAINT ${label}_id_unique IF EXISTS`)
      // Named as the declaration's apply path names it, so a later `migrate init` recognises
      // it as the object it wants rather than creating a second one.
      await session.run(`CREATE INDEX ${label}_id_index IF NOT EXISTS FOR (n:${label}) ON (n.id)`)
    }
  } finally {
    await session.close()
  }
}

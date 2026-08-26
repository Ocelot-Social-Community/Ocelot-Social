import { getDriver } from '@db/neo4j'

export const description = `
  Index Room.id, Message.id and Message.indexId.

  Every other node label gets its indices from neode's schema.install() (see
  src/db/migrate/store.ts), which derives them from the models in src/db/models. Room and
  Message have no model — they are created purely in Cypher by the chat resolvers — so they
  were never indexed.

  That was survivable while neo4j-graphql-js translated a whole selection into one traversal.
  Since the migration away from it, the chat field resolvers look their parent up by id on
  every batch (MATCH (r:Room { id: … }), MATCH (m:Message { id: … })), which without an index
  is a label scan over every room, and over every message in the instance — the fastest
  growing data there is.

  indexId additionally backs the message pagination: ORDER BY message.indexId DESC and the
  beforeIndex cursor in the Message query.

  Idempotent via IF NOT EXISTS; safe to re-run.
`

// Neo4j 4.4 syntax. Named so `down` can drop exactly what `up` created.
const INDICES = [
  { name: 'room_id', cypher: 'CREATE INDEX room_id IF NOT EXISTS FOR (r:Room) ON (r.id)' },
  { name: 'message_id', cypher: 'CREATE INDEX message_id IF NOT EXISTS FOR (m:Message) ON (m.id)' },
  {
    name: 'message_index_id',
    cypher: 'CREATE INDEX message_index_id IF NOT EXISTS FOR (m:Message) ON (m.indexId)',
  },
]

export async function up(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    // Index creation is schema work: it cannot share a transaction with other schema
    // statements in community edition, so each runs on its own.
    for (const { cypher } of INDICES) {
      await session.run(cypher)
    }
  } finally {
    await session.close()
  }
}

export async function down(_next) {
  const driver = getDriver()
  const session = driver.session()
  try {
    for (const { name } of INDICES) {
      await session.run(`DROP INDEX ${name} IF EXISTS`)
    }
  } finally {
    await session.close()
  }
}

import { getDriver } from '@db/neo4j'

import { up } from './migrations/20260821120000-message-room-id-uniqueness'

// A fake driver, for the same reason as the Article migration's spec: what has to be proven
// is which indices are left alone and in which ORDER the statements go out, and Neo4j
// Community gives no way to set up the interesting states (a constraint-backed index reported
// as UNIQUE) from a test.
jest.mock('@db/neo4j', () => ({ getDriver: jest.fn() }))

const noop = () => undefined

/** A `SHOW INDEXES` row, with the columns 4.4 reports (verified against the running server). */
const index = (name: string, label: string, property: string, uniqueness = 'NONUNIQUE') => ({
  has: (key: string) => ['name', 'labelsOrTypes', 'properties', 'uniqueness'].includes(key),
  get: (key: string) =>
    new Map<string, unknown>([
      ['name', name],
      ['labelsOrTypes', [label]],
      ['properties', [property]],
      ['uniqueness', uniqueness],
    ]).get(key),
})

const count = (value: number) => ({
  has: () => true,
  get: () => ({ toString: () => String(value) }),
})

const runWith = async (options: {
  indices?: ReturnType<typeof index>[]
  duplicates?: number
}): Promise<{ statements: string[]; error?: string }> => {
  const statements: string[] = []
  const session = {
    run: async (cypher: string) => {
      statements.push(cypher)
      if (cypher === 'SHOW INDEXES') {
        return Promise.resolve({ records: options.indices ?? [] })
      }
      if (cypher.includes('RETURN count(id) AS duplicates')) {
        return Promise.resolve({ records: [count(options.duplicates ?? 0)] })
      }
      return Promise.resolve({ records: [] })
    },
    close: async () => Promise.resolve(),
  }
  ;(getDriver as jest.Mock).mockReturnValue({ session: () => session })
  // The duplicate-id abort is a thrown Error by design — the caller (`migrate up`) has to see
  // it — so catching one here is the assertion, not a swallowed failure.
  try {
    await up(noop)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    return { statements, error: (error as Error).message }
  }
  return { statements }
}

const schemaStatements = (statements: string[]) =>
  statements.filter((statement) => statement.startsWith('DROP') || statement.startsWith('CREATE'))

describe('migration: message-room-id-uniqueness', () => {
  it('drops the plain id indices and creates the constraints', async () => {
    const { statements } = await runWith({
      indices: [
        // Both spellings exist in the wild: the hand-written migration named them one way,
        // the declaration's apply path another.
        index('room_id', 'Room', 'id'),
        index('Message_id_index', 'Message', 'id'),
      ],
    })
    expect(schemaStatements(statements)).toEqual([
      'DROP INDEX `room_id` IF EXISTS',
      'CREATE CONSTRAINT Room_id_unique IF NOT EXISTS FOR (n:Room) REQUIRE n.id IS UNIQUE',
      'DROP INDEX `Message_id_index` IF EXISTS',
      'CREATE CONSTRAINT Message_id_unique IF NOT EXISTS FOR (n:Message) REQUIRE n.id IS UNIQUE',
    ])
  })

  it('leaves Message.indexId indexed', async () => {
    // It backs the chat pagination (ORDER BY message.indexId DESC) and has nothing to do with
    // identity — dropping it would turn every page into a label scan.
    const { statements } = await runWith({
      indices: [index('Message_indexId_index', 'Message', 'indexId')],
    })
    expect(statements.filter((statement) => statement.startsWith('DROP'))).toEqual([])
  })

  it('leaves a constraint-backed index alone', async () => {
    // 4.4 lists the index backing a constraint in SHOW INDEXES as well, and refuses to drop
    // it directly. Re-running this migration must therefore not try.
    const { statements } = await runWith({
      indices: [index('Message_id_unique', 'Message', 'id', 'UNIQUE')],
    })
    expect(statements.filter((statement) => statement.startsWith('DROP'))).toEqual([])
  })

  it('aborts before touching anything when ids are not unique yet', async () => {
    // Order matters: dropping the index first and failing on the constraint afterwards would
    // leave the label with no index at all.
    const { statements, error } = await runWith({
      indices: [index('Message_id_index', 'Message', 'id')],
      duplicates: 3,
    })
    expect(error).toContain('3 id(s) occur more than once')
    expect(schemaStatements(statements)).toEqual([])
  })

  it('quotes index names, escaping a backtick by doubling it', async () => {
    const { statements } = await runWith({ indices: [index('we`ird', 'Room', 'id')] })
    expect(statements).toContain('DROP INDEX `we``ird` IF EXISTS')
  })
})

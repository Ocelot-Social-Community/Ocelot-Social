import { getDriver } from '@db/neo4j'

import { up } from './migrations/20260820140000-drop-article-secondary-label-constraints'

// A fake driver rather than the real one, unlike the other migration spec in this folder.
//
// What has to be proven is which constraints this migration LEAVES ALONE, and the constraint
// classes it must not touch — existence, node key — cannot be created on Neo4j Community,
// which is what CI runs. A real-database test could therefore only ever show the uniqueness
// case, i.e. exactly the half that was never in doubt.
jest.mock('@db/neo4j', () => ({ getDriver: jest.fn() }))

const noop = () => undefined

/** A `SHOW CONSTRAINTS` row. `get` throws for an absent field, as the driver's Record does. */
const record = (fields: Record<string, unknown>) => ({
  has: (key: string) => key in fields,
  get: (key: string) => {
    if (!(key in fields)) {
      throw new Error(`This record has no field with key '${key}'`)
    }
    return new Map(Object.entries(fields)).get(key)
  },
})

const runWith = async (constraints: Record<string, unknown>[]): Promise<string[]> => {
  const statements: string[] = []
  const session = {
    run: async (cypher: string) => {
      statements.push(cypher)
      return Promise.resolve({
        records: cypher === 'SHOW CONSTRAINTS' ? constraints.map(record) : [],
      })
    },
    close: async () => Promise.resolve(),
  }
  ;(getDriver as jest.Mock).mockReturnValue({ session: () => session })
  await up(noop)
  return statements.filter((statement) => statement.startsWith('DROP'))
}

const uniquenessOnArticle = {
  name: 'constraint_680d649a',
  type: 'UNIQUENESS',
  labelsOrTypes: ['Article'],
  properties: ['id'],
}

describe('migration: drop-article-secondary-label-constraints', () => {
  it('drops the uniqueness constraints that extend() installed on :Article', async () => {
    expect(
      await runWith([
        uniquenessOnArticle,
        { ...uniquenessOnArticle, name: 'constraint_dc463a88', properties: ['slug'] },
      ]),
    ).toEqual([
      'DROP CONSTRAINT `constraint_680d649a` IF EXISTS',
      'DROP CONSTRAINT `constraint_dc463a88` IF EXISTS',
    ])
  })

  it('leaves the primary label alone', async () => {
    // Post(id) and Post(slug) are the constraints that actually enforce the invariant — the
    // whole point of dropping the Article pair is that these already reject everything it did.
    expect(
      await runWith([{ ...uniquenessOnArticle, labelsOrTypes: ['Post'], name: 'Post_id_unique' }]),
    ).toEqual([])
  })

  it('leaves every constraint class it cannot recreate alone', async () => {
    // `down()` restores two UNIQUENESS constraints and nothing else, so dropping any other
    // class here would be a one-way removal of a guarantee this migration never claimed.
    for (const type of ['NODE_PROPERTY_EXISTENCE', 'NODE_KEY', 'RELATIONSHIP_PROPERTY_EXISTENCE']) {
      expect(await runWith([{ ...uniquenessOnArticle, type }])).toEqual([])
    }
  })

  it('leaves a row whose type it cannot read alone', async () => {
    // Neo4j 4.4 reports a `type` column; a server that does not is a server whose answer is
    // unknown, and "do not drop" is the safe direction for an unknown.
    const { type: _type, ...withoutType } = uniquenessOnArticle
    expect(await runWith([withoutType])).toEqual([])
  })

  it('quotes the constraint name, escaping a backtick by doubling it', async () => {
    // Generated names are safe unquoted; an operator-created `article-legacy` is a syntax
    // error without backticks, and the name cannot be passed as a parameter.
    expect(await runWith([{ ...uniquenessOnArticle, name: 'article-legacy' }])).toEqual([
      'DROP CONSTRAINT `article-legacy` IF EXISTS',
    ])
    expect(await runWith([{ ...uniquenessOnArticle, name: 'we`ird' }])).toEqual([
      'DROP CONSTRAINT `we``ird` IF EXISTS',
    ])
  })
})

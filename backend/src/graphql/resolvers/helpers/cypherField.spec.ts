import { describe, expect, it } from 'vitest'

import { createLoaders } from '@src/context/loaders'

import cypherFields, { underscoreIdResolver, unwrap } from './cypherField'

import type { Context } from '@src/context'
import type { Driver } from 'neo4j-driver'

// These resolvers replaced the @cypher directives neo4j-graphql-js used to execute, so what has
// to hold is not "does it return a value" but the three things the directive did for free and a
// hand-written resolver has to do itself: bind the parent as `this`, batch the calls a list of N
// parents produces, and hand GraphQL something it can serialise (Bolt integers are the reason).
//
// The statement text and the query COUNT are therefore the assertions, not just the result: both
// are invisible from a resolver's return value, and both are where the regressions are.

type FieldResolver = (
  parent: Record<string, unknown> | null,
  params: Record<string, unknown> | undefined,
  context: Context,
) => Promise<unknown>

// Looked up through `entries` rather than by index: the field name is a literal here either way,
// but indexing a record with a variable is the pattern the object-injection rule is watching for.
const resolverFor = (resolvers: Record<string, unknown>, field: string): FieldResolver => {
  const found = Object.entries(resolvers).find(([name]) => name === field)?.[1]

  return found as FieldResolver
}

// A driver double plus the REAL loaders. The batching is the behaviour under test, so a
// hand-rolled loader stub would test the stub — DataLoader's tick semantics decide whether two
// sibling resolutions become one statement.
const makeContext = ({
  valueFor = (id: string) => `value-for-${id}`,
  missing = [] as string[],
}: {
  valueFor?: (id: string) => unknown
  missing?: string[]
} = {}) => {
  const statements: Array<{ cypher: string; params: Record<string, unknown> }> = []

  const session = {
    readTransaction: async (work: (transaction: unknown) => Promise<unknown>) =>
      work({
        // Awaited on purpose: a real driver call resolves on a later tick, so the resolver is
        // exercised across that suspension instead of running through as if Neo4j were
        // synchronous.
        run: async (cypher: string, params: Record<string, unknown>) => {
          statements.push({ cypher, params })
          await Promise.resolve()
          const ids = params.ids as string[]
          return {
            records: ids
              .filter((id) => !missing.includes(id))
              .map((id) => ({
                get: (key: string) => (key === '__id' ? id : valueFor(id)),
              })),
          }
        },
      }),
    close: async () => {
      await Promise.resolve()
    },
  }

  const driver = { session: () => session } as unknown as Driver
  const context = { driver, loaders: createLoaders(driver, null) } as unknown as Context

  return { context, statements }
}

describe(unwrap, () => {
  // GraphQL cannot serialise `undefined` for a nullable field the way it serialises null, and a
  // Cypher projection produces both.
  it.each([[null], [undefined]])('maps %s to null', (value) => {
    expect(unwrap(value)).toBeNull()
  })

  it.each([['text'], [42], [true]])('passes the primitive %s through', (value) => {
    expect(unwrap(value)).toBe(value)
  })

  // The reason this function has to exist at all: Bolt returns integers as `{ low, high }` and
  // graphql-js rejects that with "Int cannot represent non-integer value: { low: 2, high: 0 }".
  // neo4j-graphql-js converted them while translating; a hand-written `RETURN node { .* }` does
  // not.
  it('converts a Bolt integer to a number', () => {
    expect(unwrap({ low: 7, high: 0, toNumber: () => 7 })).toBe(7)
  })

  // A field resolver is expected to return a node's properties, not the driver's wrapper — with
  // the wrapper, every field of the type would resolve to null.
  it('returns the properties of a node', () => {
    const node = { labels: ['Post'], properties: { id: 'p1', clickedCount: { toNumber: () => 3 } } }

    expect(unwrap(node)).toEqual({ id: 'p1', clickedCount: 3 })
  })

  // Without the explicit Date case, the map branch below would take it apart: `Object.entries` on
  // a Date is empty, so every temporal field would resolve to `{}`.
  it('keeps a Date intact', () => {
    const date = new Date('2020-01-01T00:00:00.000Z')

    expect(unwrap(date)).toBe(date)
  })

  it('walks lists and nested projection maps', () => {
    const value = unwrap([
      { count: { toNumber: () => 2 }, nested: { deep: { toNumber: () => 5 } } },
      null,
    ])

    expect(value).toEqual([{ count: 2, nested: { deep: 5 } }, null])
  })
})

describe('cypherFields statement', () => {
  // The statements were taken over from the .gql files UNCHANGED, and they all refer to `this`.
  // The MATCH prefix is what binds it — get the label or the id property wrong and every one of
  // them silently matches nothing.
  it('binds the parent as `this` and runs the statement unchanged', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Room', { roomId: 'RETURN this.id' })

    await resolverFor(resolvers, 'roomId')({ id: 'r1' }, {}, context)

    expect(statements).toHaveLength(1)
    expect(statements[0].cypher).toContain('MATCH (this:Room { id: __id })')
    expect(statements[0].cypher).toContain('RETURN this.id AS __value')
    expect(statements[0].params.ids).toEqual(['r1'])
  })

  // Not every type is matched by `id`: the caller says which property identifies the parent, and
  // it has to reach both the MATCH and the value the loader is keyed by.
  it('matches on a custom id attribute', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields(
      'User',
      { postsCount: 'RETURN count(this)' },
      { idAttribute: 'slug' },
    )

    await resolverFor(resolvers, 'postsCount')({ slug: 'peter-lustig' }, {}, context)

    expect(statements[0].cypher).toContain('MATCH (this:User { slug: __id })')
    expect(statements[0].params.ids).toEqual(['peter-lustig'])
  })

  // Cypher rejects a query whose parameter is MISSING ("Expected parameter(s): lang"), and a
  // resolver is not always reached through GraphQL — a subscription payload or another resolver
  // passes no arguments at all, so the schema's own default never gets applied.
  it('supplies the declared defaults when called without arguments', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Location', {
      name: { statement: 'RETURN this[$lang]', defaults: { lang: 'en' }, always: true },
    })

    await resolverFor(resolvers, 'name')({ id: 'l1' }, undefined, context)

    expect(statements[0].params.lang).toBe('en')
  })

  it('lets the field arguments win over the defaults', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Location', {
      name: { statement: 'RETURN this[$lang]', defaults: { lang: 'en' }, always: true },
    })

    await resolverFor(resolvers, 'name')({ id: 'l1' }, { lang: 'ru' }, context)

    expect(statements[0].params.lang).toBe('ru')
  })
})

describe('cypherFields batching', () => {
  // What the whole helper is for: a list of N parents asks the same field N times, and without
  // the loader that is N round trips for one logical question.
  it('answers a list of parents with one statement', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Post', { commentsCount: 'RETURN count(this)' })
    const resolve = resolverFor(resolvers, 'commentsCount')

    const values = await Promise.all(
      ['p1', 'p2', 'p3'].map(async (id) => resolve({ id }, {}, context)),
    )

    expect(statements).toHaveLength(1)
    expect(statements[0].params.ids).toEqual(['p1', 'p2', 'p3'])
    expect(values).toEqual(['value-for-p1', 'value-for-p2', 'value-for-p3'])
  })

  // The arguments are part of the loader key because they go into the STATEMENT: batching
  // `Location.name(lang: "ru")` together with `lang: "en"` would answer one of them in the wrong
  // language — a wrong value, not an error.
  it('keeps calls with different arguments apart', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Location', {
      name: { statement: 'RETURN this[$lang]', defaults: { lang: 'en' }, always: true },
    })
    const resolve = resolverFor(resolvers, 'name')

    await Promise.all([
      resolve({ id: 'l1' }, { lang: 'en' }, context),
      resolve({ id: 'l2' }, { lang: 'ru' }, context),
    ])

    expect(statements).toHaveLength(2)
    expect(statements.map((statement) => statement.params.lang)).toEqual(['en', 'ru'])
  })
})

describe('cypherFields parent pass-through', () => {
  // A root query that already projected the value hands it over with the parent. Asking again
  // would put a statement on the wire for data that is already in memory.
  it('uses the value the parent carries instead of querying', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Room', { roomId: 'RETURN this.id' })

    const value = await resolverFor(resolvers, 'roomId')({ id: 'r1', roomId: 'r1' }, {}, context)

    expect(value).toBe('r1')
    expect(statements).toHaveLength(0)
  })

  // `always` exists for fields whose NAME collides with a node property meaning something else:
  // Post.postType is a list derived from labels while the node carries a `postType` string,
  // Location.name is localised while the node's `name` is the raw one. Trusting the parent there
  // yields the wrong type or the wrong language — silently, since both look plausible.
  it('ignores the parent value for an `always` field', async () => {
    const { context, statements } = makeContext({ valueFor: () => ['Article'] })
    const resolvers = cypherFields('Post', {
      postType: { statement: 'RETURN labels(this)', always: true },
    })

    const value = await resolverFor(resolvers, 'postType')(
      { id: 'p1', postType: 'article' },
      {},
      context,
    )

    expect(value).toEqual(['Article'])
    expect(statements).toHaveLength(1)
  })

  // A parent CAN carry the key with a null value — a projection that coalesced to nothing, or a
  // constructed subscription payload. Passing that on unchanged fails a non-null field exactly
  // like an unresolved one would.
  it('applies the fallback when the parent carries the key as null', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Room', {
      roomName: { statement: 'RETURN this.name', fallback: 'Unknown' },
    })

    const value = await resolverFor(resolvers, 'roomName')(
      { id: 'r1', roomName: null },
      {},
      context,
    )

    expect(value).toBe('Unknown')
    expect(statements).toHaveLength(0)
  })

  // A nullable field without a fallback keeps the parent's null — and still must not re-query
  // for it, or a projection that legitimately resolved to null would cost one statement per row.
  it('keeps a null from the parent when no fallback is declared', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Room', { roomName: 'RETURN this.name' })

    const value = await resolverFor(resolvers, 'roomName')(
      { id: 'r1', roomName: null },
      {},
      context,
    )

    expect(value).toBeNull()
    expect(statements).toHaveLength(0)
  })
})

describe('cypherFields missing data', () => {
  // GraphQL refuses null on a non-null field and propagates the error to the nearest nullable
  // ancestor, which removes the WHOLE parent object from the response: one deleted chat partner
  // would blank the room, one author-less message the message.
  it('answers with the fallback when the statement matched nothing', async () => {
    const { context } = makeContext({ missing: ['r1'] })
    const resolvers = cypherFields('Room', {
      roomName: { statement: 'RETURN this.name', fallback: 'Unknown' },
    })

    await expect(resolverFor(resolvers, 'roomName')({ id: 'r1' }, {}, context)).resolves.toBe(
      'Unknown',
    )
  })

  // Without a fallback the honest answer for a nullable field is null — an empty result is what
  // the old directive produced too, not an error.
  it('answers null when the statement matched nothing and no fallback is declared', async () => {
    const { context } = makeContext({ missing: ['r1'] })
    const resolvers = cypherFields('Room', { roomName: 'RETURN this.name' })

    await expect(resolverFor(resolvers, 'roomName')({ id: 'r1' }, {}, context)).resolves.toBeNull()
  })

  // A parent with no id cannot be matched, so there is nothing to look up — but the fallback
  // still applies: from the client's side an unresolvable id is no different from a missing edge,
  // and either way a non-null field would take its parent out of the response.
  it('applies the fallback without querying when the parent has no id', async () => {
    const { context, statements } = makeContext()
    const resolvers = cypherFields('Room', {
      roomName: { statement: 'RETURN this.name', fallback: 'Unknown' },
    })

    await expect(resolverFor(resolvers, 'roomName')({}, {}, context)).resolves.toBe('Unknown')
    expect(statements).toHaveLength(0)
  })

  it.each([[{}], [null]])(
    'answers null for a parent without id and no fallback (%s)',
    async (parent) => {
      const { context, statements } = makeContext()
      const resolvers = cypherFields('Room', { roomName: 'RETURN this.name' })

      await expect(resolverFor(resolvers, 'roomName')(parent, {}, context)).resolves.toBeNull()
      expect(statements).toHaveLength(0)
    },
  )

  // The unwrapping has to happen on the way OUT of the loader as well, or an aggregate — the
  // most common shape of these statements — reaches graphql-js as `{ low, high }`.
  it('unwraps what the statement returned', async () => {
    const { context } = makeContext({ valueFor: () => ({ toNumber: () => 12 }) })
    const resolvers = cypherFields('Post', { commentsCount: 'RETURN count(this)' })

    await expect(resolverFor(resolvers, 'commentsCount')({ id: 'p1' }, {}, context)).resolves.toBe(
      12,
    )
  })
})

// vue-advanced-chat keys rooms and messages by `_id`, and Chat.vue matches a message's sender
// against `users[]._id` — where it holds the BUSINESS id, not Neo4j's internal node id. Removing
// neo4j-graphql-js would have taken the field with it.
describe('underscoreIdResolver', () => {
  it('prefers an _id the parent already carries', () => {
    expect(underscoreIdResolver._id({ _id: 'legacy', id: 'u1' })).toBe('legacy')
  })

  it('falls back to the business id', () => {
    expect(underscoreIdResolver._id({ id: 'u1' })).toBe('u1')
  })

  it('answers null when the parent has neither', () => {
    expect(underscoreIdResolver._id({})).toBeNull()
  })
})

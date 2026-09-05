import { describe, it, expect } from 'vitest'

import Resolver, {
  removeUndefinedNullValuesFromObject,
  convertObjectToCypherMapLiteral,
} from './Resolver'

import type { Context } from '@src/context'

// The factory is untyped legacy (`options: any`), so its return value arrives as a bag of
// unknowns. Naming the resolver signature once keeps every call site type-safe instead of
// silencing no-unsafe-call at each of them.
type FieldResolver = (
  parent: Record<string, unknown>,
  params: Record<string, unknown>,
  context: Context,
  resolveInfo: Record<string, unknown>,
) => Promise<unknown>

// The factory reaches the database through exactly two seams: `context.loaders.forField()` and
// the driver session runBatch opens. Doubling both makes the generated STATEMENT observable,
// which is what most of these tests are about — the Cypher this file builds encodes decisions
// (OPTIONAL vs plain MATCH, the label in the boolean subquery) that its own comments call
// load-bearing, and nothing pinned them.
const makeContext = ({
  rows = [],
}: {
  rows?: Array<{ __id: unknown; __value: unknown }>
} = {}) => {
  const statements: Array<{ cypher: string; params: Record<string, unknown> }> = []
  const fields: string[] = []

  const session = {
    readTransaction: async (work: (transaction: unknown) => Promise<unknown>) =>
      work({
        // The `await` is deliberate: a real driver call resolves on a later tick, so the
        // resolver is exercised across that suspension rather than running straight through.
        run: async (cypher: string, params: Record<string, unknown>) => {
          statements.push({ cypher, params })
          await Promise.resolve()
          return {
            records: rows.map((row) => ({
              get: (key: string) => row[key as '__id' | '__value'],
            })),
          }
        },
      }),
    close: async () => {
      await Promise.resolve()
    },
  }

  const context = {
    driver: { session: () => session },
    loaders: {
      // Stands in for DataLoader at the batch size that matters here: one key. The factory's
      // contract towards the loader is "give me the entry for this id", and the batch function
      // returns a positional array, so the double mirrors exactly that indexing.
      forField: (field: string, batchFn: (ids: readonly string[]) => Promise<unknown[]>) => {
        fields.push(field)
        return {
          load: async (id: string) => (await batchFn([id]))[0],
        }
      },
    },
  } as unknown as Context

  return { context, statements, fields }
}

const parentOf = (id: string | undefined | null) => ({ id }) as unknown as Record<string, unknown>

// Takes the factory's untyped result and hands back its resolvers as a list. Going through
// `unknown` is what makes the assertion meaningful to the type checker, and returning values
// rather than the map means the it.each rows below never index an object with a loop variable.
const fieldsOf = (resolvers: unknown): FieldResolver[] =>
  Object.values(resolvers as Record<string, FieldResolver>)

describe(removeUndefinedNullValuesFromObject, () => {
  it('removes undefined values', () => {
    const obj = { a: 1, b: undefined, c: 'hello' }
    removeUndefinedNullValuesFromObject(obj)

    expect(obj).toEqual({ a: 1, c: 'hello' })
  })

  it('removes null values', () => {
    const obj = { a: 1, b: null, c: 'hello' }
    removeUndefinedNullValuesFromObject(obj)

    expect(obj).toEqual({ a: 1, c: 'hello' })
  })

  it('keeps falsy but defined values', () => {
    const obj = { a: 0, b: false, c: '' }
    removeUndefinedNullValuesFromObject(obj)

    expect(obj).toEqual({ a: 0, b: false, c: '' })
  })

  it('handles empty object', () => {
    const obj = {}
    removeUndefinedNullValuesFromObject(obj)

    expect(obj).toEqual({})
  })
})

describe(convertObjectToCypherMapLiteral, () => {
  it('converts single entry', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0' })).toBe('{id: "g0"}')
  })

  it('converts multiple entries', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0', slug: 'yoga' })).toBe(
      '{id: "g0", slug: "yoga"}',
    )
  })

  it('returns empty string for empty object', () => {
    expect(convertObjectToCypherMapLiteral({})).toBe('')
  })

  it('adds space in front when addSpaceInfrontIfMapIsNotEmpty is true and map is not empty', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0' }, true)).toBe(' {id: "g0"}')
  })

  it('does not add space when addSpaceInfrontIfMapIsNotEmpty is true but map is empty', () => {
    expect(convertObjectToCypherMapLiteral({}, true)).toBe('')
  })

  it('does not add space when addSpaceInfrontIfMapIsNotEmpty is false', () => {
    expect(convertObjectToCypherMapLiteral({ id: 'g0' }, false)).toBe('{id: "g0"}')
  })
})

describe('Resolver factory', () => {
  it('exposes one resolver per configured field and nothing else', () => {
    const resolvers = Resolver('User', {
      boolean: { followedByCurrentUser: 'MATCH (this)<-[:FOLLOWS]-(u:User) RETURN COUNT(u) > 0' },
      count: { followedByCount: '<-[:FOLLOWS]-(related:User)' },
      hasOne: { avatar: '-[:AVATAR_IMAGE]->(related:Image)' },
      hasMany: { posts: '-[:WROTE]->(related:Post)' },
    }) as Record<string, FieldResolver>

    expect(Object.keys(resolvers).sort()).toEqual([
      'avatar',
      'followedByCount',
      'followedByCurrentUser',
      'posts',
    ])
  })

  it('returns an empty object when nothing is configured', () => {
    expect(Resolver('User')).toEqual({})
  })
})

describe('Resolver short-circuits', () => {
  // A field the parent already carries must NOT reach the database. These resolvers sit on
  // types that are frequently returned fully hydrated by a preceding mutation; without the
  // guard every such response would issue an extra query per row for data it already holds.
  it.each([
    ['hasMany', { hasMany: { posts: '-[:WROTE]->(related:Post)' } }, 'posts', ['prefetched']],
    ['hasOne', { hasOne: { avatar: '-[:AVATAR]->(related:Image)' } }, 'avatar', { url: 'x' }],
    ['count', { count: { postCount: '-[:WROTE]->(related:Post)' } }, 'postCount', 7],
    ['boolean', { boolean: { isMine: 'RETURN true' } }, 'isMine', true],
  ])('%s returns the value already present on the parent', async (_kind, options, key, value) => {
    const { context, statements, fields } = makeContext()
    // Each row configures exactly one field, so the single resolver is unambiguous — and taking
    // it by value keeps the map from being indexed with a loop variable.
    const [resolve] = fieldsOf(Resolver('User', options))

    const result = await resolve({ id: 'u1', [key]: value }, {}, context, {})

    expect(result).toEqual(value)
    expect(statements).toHaveLength(0)
    expect(fields).toHaveLength(0)
  })

  // Without the id guard the loader would be asked to load `undefined`, and the UNWIND would
  // run against a key list containing it. Each kind falls back to its own empty value, because
  // GraphQL types them differently — a null where a list is declared is a hard error.
  it.each([
    ['hasMany', { hasMany: { posts: '-[:WROTE]->(related:Post)' } }, 'posts', []],
    ['hasOne', { hasOne: { avatar: '-[:AVATAR]->(related:Image)' } }, 'avatar', null],
    ['count', { count: { postCount: '-[:WROTE]->(related:Post)' } }, 'postCount', 0],
    ['boolean', { boolean: { isMine: 'RETURN true' } }, 'isMine', false],
  ])('%s falls back when the parent has no id', async (_kind, options, key, expected) => {
    const { context, statements } = makeContext()
    const [resolve] = fieldsOf(Resolver('User', options))

    await expect(resolve(parentOf(undefined), {}, context, {})).resolves.toEqual(expected)
    await expect(resolve(parentOf(null), {}, context, {})).resolves.toEqual(expected)
    expect(statements).toHaveLength(0)
  })
})

describe('Resolver generated statements', () => {
  // OPTIONAL MATCH is the difference between a correct result and a corrupted one: a plain
  // MATCH drops parents that have no related node, the result comes back shorter than the key
  // list, and DataLoader then pairs every key after the gap with the wrong row.
  it('matches related nodes optionally so no parent drops out', async () => {
    const { context, statements } = makeContext()
    const resolvers = Resolver('User', {
      hasMany: { posts: '-[:WROTE]->(related:Post)' },
    }) as Record<string, FieldResolver>

    await resolvers.posts(parentOf('u1'), {}, context, {})

    expect(statements[0].cypher).toContain('OPTIONAL MATCH (parent)-[:WROTE]->(related:Post)')
    expect(statements[0].params.ids).toEqual(['u1'])
  })

  // The label on `this` is what makes the boolean subquery affordable. Without it the planner
  // has no indexed anchor for conditions like `MATCH (this) RETURN EXISTS(…)` and answers with
  // an AllNodesScan of the whole database per request. It is a correctness fix too: any node of
  // any type sharing the id would otherwise match.
  it('binds the boolean subquery to a labelled, id-matched node', async () => {
    const { context, statements } = makeContext()
    const resolvers = Resolver('Group', {
      boolean: { isMutedByMe: 'MATCH (this)<-[:MUTED]-(u:User) RETURN COUNT(u) > 0' },
    }) as Record<string, FieldResolver>

    await resolvers.isMutedByMe(parentOf('g1'), {}, context, {})

    expect(statements[0].cypher).toContain('MATCH (this:Group { id: __id })')
    expect(statements[0].cypher).toContain('AS isMutedByMe')
  })

  it('counts distinct related nodes', async () => {
    const { context, statements } = makeContext()
    const resolvers = Resolver('Post', {
      count: { commentsCount: '<-[:COMMENTS]-(related:Comment)' },
    }) as Record<string, FieldResolver>

    await resolvers.commentsCount(parentOf('p1'), {}, context, {})

    expect(statements[0].cypher).toContain('COUNT(DISTINCT related)')
  })

  // The id attribute is substituted into the pattern, so a type keyed by something other than
  // `id` would silently match nothing if the default leaked through.
  it('honours a custom idAttribute', async () => {
    const { context, statements } = makeContext()
    const resolvers = Resolver('Tag', {
      idAttribute: 'name',
      hasMany: { posts: '<-[:TAGGED]-(related:Post)' },
    }) as Record<string, FieldResolver>

    await resolvers.posts({ name: 'yoga' }, {}, context, {})

    expect(statements[0].cypher).toContain('MATCH (parent:Tag { name: __id })')
    expect(statements[0].params.ids).toEqual(['yoga'])
  })

  // Namespaced per type: two types sharing a field name (User.posts and Group.posts) must not
  // share a loader, or one would serve the other's batch under the same key.
  it('namespaces the loader by type and field', async () => {
    const { context, fields } = makeContext()
    const resolvers = Resolver('Group', {
      hasMany: { posts: '-[:IN]->(related:Post)' },
    }) as Record<string, FieldResolver>

    await resolvers.posts(parentOf('g1'), {}, context, {})

    expect(fields).toEqual(['Group.posts'])
  })
})

describe('Resolver result shaping', () => {
  it('hasOne unwraps the first row', async () => {
    const { context } = makeContext({ rows: [{ __id: 'u1', __value: [{ url: 'avatar.jpg' }] }] })
    const resolvers = Resolver('User', {
      hasOne: { avatar: '-[:AVATAR]->(related:Image)' },
    }) as Record<string, FieldResolver>

    await expect(resolvers.avatar(parentOf('u1'), {}, context, {})).resolves.toEqual({
      url: 'avatar.jpg',
    })
  })

  // collect() skips nulls, so a parent with no related node comes back as an empty list rather
  // than [null] — hasOne has to read that as "no value", not as a row that happens to be empty.
  it('hasOne yields null when the parent has no related node', async () => {
    const { context } = makeContext({ rows: [{ __id: 'u1', __value: [] }] })
    const resolvers = Resolver('User', {
      hasOne: { avatar: '-[:AVATAR]->(related:Image)' },
    }) as Record<string, FieldResolver>

    await expect(resolvers.avatar(parentOf('u1'), {}, context, {})).resolves.toBeNull()
  })

  it('hasMany returns every collected row', async () => {
    const { context } = makeContext({
      rows: [{ __id: 'u1', __value: [{ id: 'p1' }, { id: 'p2' }] }],
    })
    const resolvers = Resolver('User', {
      hasMany: { posts: '-[:WROTE]->(related:Post)' },
    }) as Record<string, FieldResolver>

    await expect(resolvers.posts(parentOf('u1'), {}, context, {})).resolves.toEqual([
      { id: 'p1' },
      { id: 'p2' },
    ])
  })

  // A parent the statement returned no row for still has to produce a valid value: its id is in
  // the key list either way, and DataLoader hands back whatever sits at that position.
  it('falls back to empty values when the statement returned no row for the id', async () => {
    const { context } = makeContext({ rows: [] })
    const resolvers = Resolver('User', {
      hasMany: { posts: '-[:WROTE]->(related:Post)' },
      count: { postCount: '-[:WROTE]->(related:Post)' },
      boolean: { isMine: 'RETURN true' },
    }) as Record<string, FieldResolver>

    await expect(resolvers.posts(parentOf('u1'), {}, context, {})).resolves.toEqual([])
    await expect(resolvers.postCount(parentOf('u1'), {}, context, {})).resolves.toBe(0)
    await expect(resolvers.isMine(parentOf('u1'), {}, context, {})).resolves.toBe(false)
  })
})

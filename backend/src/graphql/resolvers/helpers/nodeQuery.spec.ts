/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'

// What the Tag query does with the filter operators its schema advertises.
//
// `_TagFilter` offers eight of them; nodeQuery implements one. The other seven must FAIL
// rather than be ignored, because an ignored filter returns more rows than were asked for —
// the direction that leaks. The rejection is the contract being tested here, so it is
// exercised through the query a client actually sends, not through the builder.

let setup: ApolloTestSetup

const tagQuery = parse(`
  query ($filter: _TagFilter) {
    Tag(filter: $filter) {
      id
    }
  }
`)

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser: null }) })
  await Promise.all([
    Factory.build('tag', { id: 'nodequery-alpha' }),
    Factory.build('tag', { id: 'nodequery-beta' }),
    Factory.build('tag', { id: 'nodequery-gamma' }),
  ])
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('Tag filter', () => {
  it('applies the implemented operator', async () => {
    const { data, errors } = await setup.query({
      query: tagQuery,
      variables: { filter: { id_in: ['nodequery-alpha', 'nodequery-gamma'] } },
    })

    expect(errors).toBeUndefined()
    expect(data?.Tag).toEqual([{ id: 'nodequery-alpha' }, { id: 'nodequery-gamma' }])
  })

  it('treats id as a one-element id_in', async () => {
    const { data, errors } = await setup.query({
      query: tagQuery,
      variables: { filter: { id: 'nodequery-beta' } },
    })

    expect(errors).toBeUndefined()
    expect(data?.Tag).toEqual([{ id: 'nodequery-beta' }])
  })

  it('rejects id and id_in together', async () => {
    // The two express the same thing — `id` is documented as a one-element `id_in` — so
    // supplying both is a client mistake. Answering it by ANDing them would hand back an
    // empty list with no indication that the filter contradicted itself.
    const { data, errors } = await setup.query({
      query: tagQuery,
      variables: { filter: { id: 'nodequery-alpha', id_in: ['nodequery-beta'] } },
    })

    expect(errors?.[0].message).toContain('use either `id` or `id_in`, not both')
    expect(data?.Tag).toBeFalsy()
  })

  it.each([
    ['id is explicitly null', { id: null, id_in: ['nodequery-beta'] }, ['nodequery-beta']],
    ['id_in is explicitly null', { id: 'nodequery-beta', id_in: null }, ['nodequery-beta']],
  ])('accepts the pair when %s', async (_name, filter, expected) => {
    // The conflict check has to agree with the loop that applies the filters, and that loop
    // skips null values. GraphQL allows an explicit null for a nullable input field — a
    // client passing a form object straight through sends exactly this — so treating it as
    // "set" would reject a filter the resolver then runs as a plain one-sided lookup.
    const { data, errors } = await setup.query({ query: tagQuery, variables: { filter } })

    expect(errors).toBeUndefined()
    expect(data?.Tag).toEqual(expected.map((id) => ({ id })))
  })

  it.each(['id_not', 'id_not_in', 'taggedPosts_some'])(
    'rejects the undeclared operator %s',
    async (key) => {
      const value = key.endsWith('_in') ? ['nodequery-alpha'] : 'nodequery-alpha'

      const { data, errors } = await setup.query({
        query: tagQuery,
        variables: { filter: { [key]: value } },
      })

      // These used to be declared on _TagFilter while only id_in was implemented, so they
      // reached the resolver and died there. Scoping the input to what nodeQuery implements
      // moves the rejection into variable coercion — the same answer, one layer earlier and
      // without touching the database. What must never happen is the quiet outcome: no
      // error, and every tag returned as though no filter had been passed.
      expect(errors?.[0].message).toMatch(/is not defined by type|Unsupported Tag filter/)
      expect(data?.Tag).toBeFalsy()
    },
  )
})

describe('Tag paging', () => {
  const pagedQuery = parse(`
    query ($first: Int, $offset: Int) {
      Tag(first: $first, offset: $offset) {
        id
      }
    }
  `)

  const run = async (variables: Record<string, unknown>) =>
    setup.query({ query: pagedQuery, variables })

  it('returns an empty page for first: 0', async () => {
    // 0 is a page size, not an absent argument. Reading it as "unset" drops the LIMIT and
    // answers the narrowest request with every row — the failure this asserts against.
    const { data, errors } = await run({ first: 0 })

    expect(errors).toBeUndefined()
    expect(data?.Tag).toEqual([])
  })

  it('still returns everything when first is omitted', async () => {
    const { data } = await run({})

    expect(data?.Tag).toHaveLength(3)
  })

  it('pages with offset', async () => {
    const { data } = await run({ first: 1, offset: 1 })

    expect(data?.Tag).toEqual([{ id: 'nodequery-beta' }])
  })

  it.each([
    ['first', { first: -1 }],
    ['offset', { offset: -1 }],
  ])('rejects a negative %s', async (argument, variables) => {
    // Neo4j answers a negative SKIP/LIMIT with an internal error, which would reach the
    // client as a 500 for what is plainly a bad request.
    const { errors } = await run(variables)

    expect(errors?.[0].message).toContain(`Argument "${argument}" must not be negative`)
  })
})

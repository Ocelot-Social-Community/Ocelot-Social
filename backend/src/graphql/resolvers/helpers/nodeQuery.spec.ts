/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'

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

  it.each(['id', 'id_not', 'id_not_in'])('rejects the unimplemented operator %s', async (key) => {
    const value = key.endsWith('_in') ? ['nodequery-alpha'] : 'nodequery-alpha'

    const { data, errors } = await setup.query({
      query: tagQuery,
      variables: { filter: { [key]: value } },
    })

    // The failure mode this guards against is the quiet one: no error, and every tag
    // returned as though no filter had been passed.
    expect(errors?.[0].message).toContain('Unsupported Tag filter')
    expect(data?.Tag).toBeFalsy()
  })
})

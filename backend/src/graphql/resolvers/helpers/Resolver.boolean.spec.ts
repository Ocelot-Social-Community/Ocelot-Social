/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// Resolver()'s boolean fields bind their parent BY LABEL.
//
// The condition is a whole statement (`MATCH (this) RETURN EXISTS(…)`), and `this` is bound
// by a preceding match. Binding it without the label — which is what substituting into the
// condition produced — is wrong twice over:
//
//  1. Correctness. `MATCH (this { id: … })` matches a node of ANY type carrying that id. The
//     CALL subquery then returns one row per match, the outer query multiplies, and the batch
//     indexes them into a map by id: the last row silently wins. Which one that is, is up to
//     the planner.
//  2. Cost. With no other indexed anchor in the condition, the planner answered an unlabelled
//     match with an AllNodesScan of the whole database, per request.
//
// The fixture below forces case 1 by giving a Group and a Post the same id — the failure this
// guards is a wrong answer, not an error.

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

const SHARED_ID = 'boolean-shared-id'

const groupQuery = parse(`
  query ($id: ID) {
    Group(id: $id) {
      id
      isMutedByMe
    }
  }
`)

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({
    context: () => ({ authenticatedUser, policy: { groupsEnabled: true } }),
  })

  const viewer = await Factory.build('user', { id: 'boolean-viewer', name: 'Boolean Viewer' })
  authenticatedUser = await viewer.toJson()

  await Factory.build(
    'group',
    { id: SHARED_ID, name: 'Muted Group', slug: 'muted-group', groupType: 'public' },
    { creator: viewer },
  )
  // A node of a DIFFERENT type carrying the same id. It has no MUTED edge, so an unlabelled
  // match can answer the group's question with the post's (missing) relationship.
  await setup.database.write({
    query: `CREATE (:Post { id: $id, title: 'Collides', content: 'x' })`,
    variables: { id: SHARED_ID },
  })
  await setup.database.write({
    query: `
      MATCH (viewer:User { id: 'boolean-viewer' }), (group:Group { id: $id })
      MERGE (viewer)-[:MUTED]->(group)
    `,
    variables: { id: SHARED_ID },
  })
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('boolean fields', () => {
  it('answers for the parent type, not for any node sharing its id', async () => {
    const { data, errors } = await setup.query({
      query: groupQuery,
      variables: { id: SHARED_ID },
    })

    expect(errors).toBeUndefined()
    // Exactly one row: an unlabelled match would also let the Post through the subquery.
    expect(data?.Group).toHaveLength(1)
    expect(data?.Group[0].isMutedByMe).toBe(true)
  })
})

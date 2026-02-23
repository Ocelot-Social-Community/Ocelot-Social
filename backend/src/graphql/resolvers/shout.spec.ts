/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import { Post } from '@graphql/queries/Post'
import { shout } from '@graphql/queries/shout'
import { unshout } from '@graphql/queries/unshout'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let variables

const contextFn = () => ({
  authenticatedUser,
})

describe('shout and unshout posts', () => {
  let currentUser, postAuthor

  beforeAll(async () => {
    await cleanDatabase()

    authenticatedUser = undefined
    const apolloSetup = await createApolloTestSetup({ context: contextFn })
    query = apolloSetup.query
    mutate = apolloSetup.mutate
    database = apolloSetup.database
    server = apolloSetup.server
  })

  afterAll(async () => {
    await cleanDatabase()
    void server.stop()
    void database.driver.close()
    database.neode.close()
  })

  beforeEach(async () => {
    currentUser = await Factory.build(
      'user',
      {
        id: 'current-user-id',
        name: 'Current User',
      },
      {
        email: 'current.user@example.org',
        password: '1234',
      },
    )

    postAuthor = await Factory.build(
      'user',
      {
        id: 'id-of-another-user',
        name: 'Another User',
      },
      {
        email: 'another.user@example.org',
        password: '1234',
      },
    )
  })

  // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('shout', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        variables = { id: 'post-to-shout-id' }
        authenticatedUser = undefined
        await expect(mutate({ mutation: shout, variables })).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })
    describe('authenticated', () => {
      beforeEach(async () => {
        authenticatedUser = await currentUser.toJson()
        await Factory.build(
          'post',
          {
            name: 'Other user post',
            id: 'another-user-post-id',
          },
          {
            author: postAuthor,
          },
        )
        await Factory.build(
          'post',
          {
            name: 'current user post',
            id: 'current-user-post-id',
          },
          {
            author: currentUser,
          },
        )
        variables = {}
      })

      it("can shout another user's post", async () => {
        variables = { id: 'another-user-post-id' }
        await expect(mutate({ mutation: shout, variables })).resolves.toMatchObject({
          data: { shout: true },
        })
        await expect(query({ query: Post, variables })).resolves.toMatchObject({
          data: { Post: [{ id: 'another-user-post-id', shoutedBy: [{ id: 'current-user-id' }] }] },
          errors: undefined,
        })
      })

      it('adds `createdAt` to `SHOUT` relationship', async () => {
        variables = { id: 'another-user-post-id' }
        await mutate({ mutation: shout, variables })
        const relation = await database.neode.cypher(
          'MATCH (user:User {id: $userId1})-[relationship:SHOUTED]->(node {id: $userId2}) WHERE relationship.createdAt IS NOT NULL RETURN relationship',
          {
            userId1: 'current-user-id',
            userId2: 'another-user-post-id',
          },
        )
        const relationshipProperties = relation.records.map(
          (record) => record.get('relationship').properties.createdAt,
        )
        expect(relationshipProperties[0]).toEqual(expect.any(String))
      })

      it('can not shout my own post', async () => {
        variables = { id: 'current-user-post-id' }
        await expect(mutate({ mutation: shout, variables })).resolves.toMatchObject({
          data: { shout: false },
        })
        await expect(query({ query: Post, variables })).resolves.toMatchObject({
          data: { Post: [{ id: 'current-user-post-id', shoutedBy: [] }] },
          errors: undefined,
        })
      })
    })
  })
  describe('unshout', () => {
    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = undefined
        variables = { id: 'post-to-shout-id' }
        await expect(mutate({ mutation: unshout, variables })).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated', () => {
      beforeEach(async () => {
        authenticatedUser = await currentUser.toJson()
        await Factory.build(
          'post',
          {
            name: 'Posted By Another User',
            id: 'posted-by-another-user',
          },
          {
            author: postAuthor,
          },
        )
        await mutate({
          mutation: shout,
          variables: { id: 'posted-by-another-user' },
        })
      })

      it("can unshout another user's post", async () => {
        variables = { id: 'posted-by-another-user' }
        await expect(mutate({ mutation: unshout, variables })).resolves.toMatchObject({
          data: { unshout: true },
        })
        await expect(query({ query: Post, variables })).resolves.toMatchObject({
          data: { Post: [{ id: 'posted-by-another-user', shoutedBy: [] }] },
          errors: undefined,
        })
      })
    })
  })
})

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTestClient } from 'apollo-server-testing'

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver, getNeode } from '@db/neo4j'
import { followUser } from '@graphql/queries/followUser'
import { unfollowUser } from '@graphql/queries/unfollowUser'
import { User } from '@graphql/queries/User'
import createServer from '@src/server'

const driver = getDriver()
const neode = getNeode()

let query
let mutate
let authenticatedUser

let user1
let user2
let variables

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => ({
      driver,
      neode,
      user: authenticatedUser,
      cypherParams: {
        currentUserId: authenticatedUser ? authenticatedUser.id : null,
      },
    }),
  })

  const testClient = createTestClient(server)
  query = testClient.query
  mutate = testClient.mutate
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

beforeEach(async () => {
  user1 = await Factory.build(
    'user',
    {
      id: 'u1',
      name: 'user1',
    },
    {
      email: 'test@example.org',
      password: '1234',
    },
  ).then((user) => user.toJson())
  user2 = await Factory.build(
    'user',
    {
      id: 'u2',
      name: 'user2',
    },
    {
      email: 'test2@example.org',
      password: '1234',
    },
  ).then((user) => user.toJson())

  authenticatedUser = user1
  variables = { id: user2.id }
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('follow', () => {
  describe('follow user', () => {
    describe('unauthenticated follow', () => {
      test('throws authorization error', async () => {
        authenticatedUser = null
        await expect(
          mutate({
            mutation: followUser,
            variables,
          }),
        ).resolves.toMatchObject({
          errors: [{ message: 'Not Authorized!' }],
          data: { followUser: null },
        })
      })
    })

    test('I can follow another user', async () => {
      const expectedUser = {
        name: user2.name,
        followedBy: [{ id: user1.id, name: user1.name }],
        followedByCurrentUser: true,
      }
      await expect(
        mutate({
          mutation: followUser,
          variables,
        }),
      ).resolves.toMatchObject({
        data: { followUser: expectedUser },
        errors: undefined,
      })
    })

    test('adds `createdAt` to `FOLLOW` relationship', async () => {
      await mutate({
        mutation: followUser,
        variables,
      })
      const relation = await neode.cypher(
        'MATCH (user:User {id: $id})-[relationship:FOLLOWS]->(followed:User) WHERE relationship.createdAt IS NOT NULL RETURN relationship',
        { id: 'u1' },
      )
      const relationshipProperties = relation.records.map(
        (record) => record.get('relationship').properties.createdAt,
      )
      expect(relationshipProperties[0]).toEqual(expect.any(String))
    })

    test('I can`t follow myself', async () => {
      variables.id = user1.id
      await expect(mutate({ mutation: followUser, variables })).resolves.toMatchObject({
        data: { followUser: null },
        errors: undefined,
      })

      const expectedUser = {
        followedBy: [],
        followedByCurrentUser: false,
      }
      await expect(
        query({
          query: User,
          variables: { id: user1.id },
        }),
      ).resolves.toMatchObject({
        data: {
          User: [expectedUser],
        },
        errors: undefined,
      })
    })
  })

  describe('unfollow user', () => {
    beforeEach(async () => {
      variables = { id: user2.id }
      await mutate({ mutation: followUser, variables })
    })

    describe('unauthenticated follow', () => {
      test('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: unfollowUser, variables })).resolves.toMatchObject({
          data: { unfollowUser: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    test('I can unfollow a user', async () => {
      const expectedUser = {
        name: user2.name,
        followedBy: [],
        followedByCurrentUser: false,
      }
      await expect(mutate({ mutation: unfollowUser, variables })).resolves.toMatchObject({
        data: { unfollowUser: expectedUser },
        errors: undefined,
      })
    })
  })
})

import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import gql from 'graphql-tag'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'

let mutate, query, authenticatedUser, variables
const instance = getNeode()
const driver = getDriver()

const mutationShoutPost = gql`
  mutation ($id: ID!) {
    shout(id: $id, type: Post)
  }
`
const mutationUnshoutPost = gql`
  mutation ($id: ID!) {
    unshout(id: $id, type: Post)
  }
`
const queryPost = gql`
  query ($id: ID!) {
    Post(id: $id) {
      id
      shoutedBy {
        id
      }
    }
  }
`

describe('shout and unshout posts', () => {
  let currentUser, postAuthor

  beforeAll(async () => {
    await cleanDatabase()

    authenticatedUser = undefined
    const { server } = createServer({
      context: () => {
        return {
          driver,
          neode: instance,
          user: authenticatedUser,
        }
      },
    })
    mutate = createTestClient(server).mutate
    query = createTestClient(server).query
  })

  afterAll(async () => {
    await cleanDatabase()
    driver.close()
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
        await expect(mutate({ mutation: mutationShoutPost, variables })).resolves.toMatchObject({
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
        await expect(mutate({ mutation: mutationShoutPost, variables })).resolves.toMatchObject({
          data: { shout: true },
        })
        await expect(query({ query: queryPost, variables })).resolves.toMatchObject({
          data: { Post: [{ id: 'another-user-post-id', shoutedBy: [{ id: 'current-user-id' }] }] },
          errors: undefined,
        })
      })

      it('adds `createdAt` to `SHOUT` relationship', async () => {
        variables = { id: 'another-user-post-id' }
        await mutate({ mutation: mutationShoutPost, variables })
        const relation = await instance.cypher(
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
        await expect(mutate({ mutation: mutationShoutPost, variables })).resolves.toMatchObject({
          data: { shout: false },
        })
        await expect(query({ query: queryPost, variables })).resolves.toMatchObject({
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
        await expect(mutate({ mutation: mutationUnshoutPost, variables })).resolves.toMatchObject({
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
          mutation: mutationShoutPost,
          variables: { id: 'posted-by-another-user' },
        })
      })

      it("can unshout another user's post", async () => {
        variables = { id: 'posted-by-another-user' }
        await expect(mutate({ mutation: mutationUnshoutPost, variables })).resolves.toMatchObject({
          data: { unshout: true },
        })
        await expect(query({ query: queryPost, variables })).resolves.toMatchObject({
          data: { Post: [{ id: 'posted-by-another-user', shoutedBy: [] }] },
          errors: undefined,
        })
      })
    })
  })
})

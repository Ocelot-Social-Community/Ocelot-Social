/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'

import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import { statistics } from '@graphql/queries/statistics'
import createServer, { getContext } from '@src/server'

const database = databaseContext()

let server: ApolloServer
let query, authenticatedUser

beforeAll(async () => {
  await cleanDatabase()

  // eslint-disable-next-line @typescript-eslint/require-await
  const contextUser = async (_req) => authenticatedUser
  const context = getContext({ user: contextUser, database })

  server = createServer({ context }).server

  const createTestClientResult = createTestClient(server)
  query = createTestClientResult.query
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

afterEach(async () => {
  await cleanDatabase()
})

describe('statistics', () => {
  describe('countUsers', () => {
    beforeEach(async () => {
      await Promise.all(
        [...Array(6).keys()].map(() => {
          return Factory.build('user')
        }),
      )
    })

    it('returns the count of all users', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: { statistics: { users: 6 } },
        errors: undefined,
      })
    })
  })

  describe('countPosts', () => {
    beforeEach(async () => {
      await Promise.all(
        [...Array(3).keys()].map(() => {
          return Factory.build('post')
        }),
      )
    })

    it('returns the count of all posts', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: { statistics: { posts: 3 } },
        errors: undefined,
      })
    })
  })

  describe('countComments', () => {
    beforeEach(async () => {
      await Promise.all(
        [...Array(2).keys()].map(() => {
          return Factory.build('comment')
        }),
      )
    })

    it('returns the count of all comments', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: { statistics: { comments: 2 } },
        errors: undefined,
      })
    })
  })

  describe('countFollows', () => {
    let users
    beforeEach(async () => {
      users = await Promise.all(
        [...Array(2).keys()].map(() => {
          return Factory.build('user')
        }),
      )
      await users[0].relateTo(users[1], 'following')
    })

    it('returns the count of all follows', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: { statistics: { follows: 1 } },
        errors: undefined,
      })
    })
  })

  describe('countShouts', () => {
    let users, posts
    beforeEach(async () => {
      users = await Promise.all(
        [...Array(2).keys()].map(() => {
          return Factory.build('user')
        }),
      )
      posts = await Promise.all(
        [...Array(3).keys()].map(() => {
          return Factory.build('post')
        }),
      )
      await Promise.all([
        users[0].relateTo(posts[1], 'shouted'),
        users[1].relateTo(posts[0], 'shouted'),
      ])
    })

    it('returns the count of all shouts', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: { statistics: { shouts: 2 } },
        errors: undefined,
      })
    })
  })
})

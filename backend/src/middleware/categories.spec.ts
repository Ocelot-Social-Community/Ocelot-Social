/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApolloServer } from 'apollo-server-express'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import CONFIG from '@src/config'
import { categories } from '@src/constants/categories'
import createServer, { getContext } from '@src/server'

const database = databaseContext()

let server: ApolloServer
let query

beforeAll(async () => {
  await cleanDatabase()
  const authenticatedUser = null

  // eslint-disable-next-line @typescript-eslint/require-await
  const contextUser = async (_req) => authenticatedUser
  const context = getContext({ user: contextUser, database })

  server = createServer({ context }).server

  const createTestClientResult = createTestClient(server)
  query = createTestClientResult.query

  for (const category of categories) {
    await Factory.build('category', {
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
    })
  }
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

const categoriesQuery = gql`
  query {
    Category {
      id
      slug
      name
      icon
    }
  }
`

describe('categroeis middleware', () => {
  describe('categories are active', () => {
    beforeEach(() => {
      CONFIG.CATEGORIES_ACTIVE = true
    })

    it('returns the categories', async () => {
      await expect(
        query({
          query: categoriesQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          Category: expect.arrayContaining(categories),
        },
        errors: undefined,
      })
    })
  })

  describe('categories are not active', () => {
    beforeEach(() => {
      CONFIG.CATEGORIES_ACTIVE = false
    })

    it('returns an empty array though there are categories in the db', async () => {
      await expect(
        query({
          query: categoriesQuery,
        }),
      ).resolves.toMatchObject({
        data: {
          Category: [],
        },
        errors: undefined,
      })
    })
  })
})

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import { categories } from '@src/constants/categories'

let authenticatedUser
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const contextUser = () => authenticatedUser

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ contextUser })
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
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

describe('categories middleware', () => {
  describe('categories are active', () => {
    beforeAll(() => {
      const apolloSetup = createApolloTestSetup({
        contextUser,
        config: { CATEGORIES_ACTIVE: true },
      })
      query = apolloSetup.query
      database = apolloSetup.database
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
    beforeAll(() => {
      const apolloSetup = createApolloTestSetup({
        contextUser,
        config: { CATEGORIES_ACTIVE: false },
      })
      query = apolloSetup.query
      database = apolloSetup.database
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

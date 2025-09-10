/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import Factory, { cleanDatabase } from '@db/factories'
import { Category } from '@graphql/queries/Category'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import { categories } from '@src/constants/categories'
import type { Context } from '@src/context'

let config: Partial<Context['config']>
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeEach(() => {
  config = {}
})

beforeAll(async () => {
  await cleanDatabase()
  const context = () => ({ config, authenticatedUser: null })
  const apolloSetup = createApolloTestSetup({ context })
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

describe('categories middleware', () => {
  describe('categories are active', () => {
    beforeEach(() => {
      config = { ...config, CATEGORIES_ACTIVE: true }
    })

    it('returns the categories', async () => {
      await expect(
        query({
          query: Category,
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
      config = { ...config, CATEGORIES_ACTIVE: false }
    })

    it('returns an empty array though there are categories in the db', async () => {
      await expect(
        query({
          query: Category,
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

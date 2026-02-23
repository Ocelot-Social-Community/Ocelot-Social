import { cleanDatabase } from '@db/factories'
import Post from '@graphql/queries/Post.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'

let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const contextFn = () => ({
  authenticatedUser: null,
})

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context: contextFn })
  query = apolloSetup.query
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
  await database.neode.create('Post', { title: 'first', content: 'content' })
  await database.neode.create('Post', { title: 'second', content: 'content' })
  await database.neode.create('Post', { title: 'third', content: 'content' })
  await database.neode.create('Post', { title: 'last', content: 'content' })
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('Query', () => {
  describe('Post', () => {
    describe('orderBy', () => {
      it('createdAt descending is default', async () => {
        await expect(query({ query: Post })).resolves.toMatchObject({
          data: {
            Post: [
              expect.objectContaining({ title: 'last' }),
              expect.objectContaining({ title: 'third' }),
              expect.objectContaining({ title: 'second' }),
              expect.objectContaining({ title: 'first' }),
            ],
          },
        })
      })

      describe('(orderBy: createdAt_asc)', () => {
        it('orders by createdAt ascending', async () => {
          await expect(
            query({
              query: Post,
              variables: { orderBy: 'createdAt_asc' },
            }),
          ).resolves.toMatchObject({
            data: {
              Post: [
                expect.objectContaining({ title: 'first' }),
                expect.objectContaining({ title: 'second' }),
                expect.objectContaining({ title: 'third' }),
                expect.objectContaining({ title: 'last' }),
              ],
            },
          })
        })
      })
    })
  })
})

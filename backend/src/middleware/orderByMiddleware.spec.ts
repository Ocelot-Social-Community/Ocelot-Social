/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import { createApolloTestSetup } from '@root/test/helpers'
import { Post } from '@graphql/queries/Post'

const neode = getNeode()
const driver = getDriver()

let query

const contextFn = () => ({
  authenticatedUser: null,
})

beforeAll(async () => {
  await cleanDatabase()

  ;({ query } = await createApolloTestSetup({ context: contextFn }))
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

beforeEach(async () => {
  await neode.create('Post', { title: 'first', content: 'content' })
  await neode.create('Post', { title: 'second', content: 'content' })
  await neode.create('Post', { title: 'third', content: 'content' })
  await neode.create('Post', { title: 'last', content: 'content' })
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

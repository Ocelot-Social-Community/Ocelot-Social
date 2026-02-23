/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'
import { Post } from '@graphql/queries/Post'
import { createApolloTestSetup } from '@root/test/helpers'

let query, aUser, bUser, post, authenticatedUser, variables

const driver = getDriver()

const contextFn = () => ({
  authenticatedUser,
})

beforeAll(async () => {
  await cleanDatabase()

  aUser = await Factory.build('user', {
    id: 'a-user',
  })
  bUser = await Factory.build('user', {
    id: 'b-user',
  })
  post = await Factory.build('post')
  authenticatedUser = await aUser.toJson()
  ;({ query } = await createApolloTestSetup({ context: contextFn }))
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

describe('middleware/userInteractions', () => {
  describe('given one post', () => {
    it('does not change clickedCount when queried without ID', async () => {
      await expect(query({ query: Post, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            expect.objectContaining({
              clickedCount: 0,
            }),
          ]),
        },
      })
    })

    it('changes clickedCount when queried with ID', async () => {
      variables = { id: post.get('id') }
      await expect(query({ query: Post, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            expect.objectContaining({
              clickedCount: 1,
            }),
          ]),
        },
      })
    })

    it('does not change clickedCount when same user queries the post again', async () => {
      await expect(query({ query: Post, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            expect.objectContaining({
              clickedCount: 1,
            }),
          ]),
        },
      })
    })

    it('changes clickedCount when another user queries the post', async () => {
      authenticatedUser = await bUser.toJson()
      await expect(query({ query: Post, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            expect.objectContaining({
              clickedCount: 2,
            }),
          ]),
        },
      })
    })
  })
})

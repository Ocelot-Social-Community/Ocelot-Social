/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import { Post } from '@graphql/queries/Post'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let authenticatedUser: Context['user']
let aUser, bUser, post, variables

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

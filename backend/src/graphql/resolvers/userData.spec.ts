/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import userData from '@graphql/queries/userData.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const contextFn = () => ({
  authenticatedUser,
})

beforeAll(async () => {
  await cleanDatabase()

  const user = await Factory.build('user', {
    id: 'a-user',
    name: 'John Doe',
    slug: 'john-doe',
  })
  await Factory.build('user', {
    id: 'o-user',
    name: 'Unauthenticated User',
    slug: 'unauthenticated-user',
  })
  authenticatedUser = await user.toJson()
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

describe('resolvers/userData', () => {
  let variables = { id: 'a-user' }

  describe('given one authenticated user who did not write anything so far', () => {
    it("returns the user's data and no posts", async () => {
      await expect(query({ query: userData, variables })).resolves.toMatchObject({
        data: {
          userData: {
            user: {
              id: 'a-user',
              name: 'John Doe',
              slug: 'john-doe',
            },
            posts: [],
          },
        },
      })
    })

    describe('the user writes a post', () => {
      beforeAll(async () => {
        await Factory.build(
          'post',
          {
            id: 'a-post',
            title: 'A post',
            content: 'A post',
          },
          { authorId: 'a-user' },
        )
      })

      it("returns the user's data and the post", async () => {
        await expect(query({ query: userData, variables })).resolves.toMatchObject({
          data: {
            userData: {
              user: {
                id: 'a-user',
                name: 'John Doe',
                slug: 'john-doe',
              },
              posts: [
                {
                  id: 'a-post',
                  title: 'A post',
                  content: 'A post',
                },
              ],
            },
          },
        })
      })
    })
  })

  describe('try to request data of another user', () => {
    variables = { id: 'o-user' }
    it('returns the data of the authenticated user', async () => {
      await expect(query({ query: userData, variables })).resolves.toMatchObject({
        data: {
          userData: {
            user: {
              id: 'a-user',
              name: 'John Doe',
              slug: 'john-doe',
            },
            posts: expect.arrayContaining([
              {
                id: 'a-post',
                title: 'A post',
                content: 'A post',
                comments: [],
              },
            ]),
          },
        },
      })
    })
  })
})

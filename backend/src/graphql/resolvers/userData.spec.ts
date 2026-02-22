/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import { userData } from '@graphql/queries/userData'
import createServer from '@src/server'

let query, authenticatedUser

const driver = getDriver()
const neode = getNeode()

const contextFn = () => ({
  driver,
  neode,
  user: authenticatedUser,
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
  const { server } = await createServer({
    context: async () => contextFn(),
  })
  query = async (opts) => {
    const result = await server.executeOperation(
      { query: opts.query, variables: opts.variables },
      { contextValue: (await contextFn()) as any },
    )
    if (result.body.kind === 'single') {
      return {
        data: (result.body.singleResult.data ?? null) as any,
        errors: result.body.singleResult.errors,
      }
    }
    return { data: null as any, errors: undefined }
  }
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
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

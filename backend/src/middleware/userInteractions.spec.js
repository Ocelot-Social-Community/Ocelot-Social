import Factory, { cleanDatabase } from '../db/factories'
import { gql } from '../helpers/jest'
import { getNeode, getDriver } from '../db/neo4j'
import createServer from '../server'
import { createTestClient } from 'apollo-server-testing'

let query, aUser, bUser, post, authenticatedUser, variables

const driver = getDriver()
const neode = getNeode()

const postQuery = gql`
  query ($id: ID) {
    Post(id: $id) {
      clickedCount
    }
  }
`

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
  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
      }
    },
  })
  query = createTestClient(server).query
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

describe('middleware/userInteractions', () => {
  describe('given one post', () => {
    it('does not change clickedCount when queried without ID', async () => {
      await expect(query({ query: postQuery, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            {
              clickedCount: 0,
            },
          ]),
        },
      })
    })

    it('changes clickedCount when queried with ID', async () => {
      variables = { id: post.get('id') }
      await expect(query({ query: postQuery, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            {
              clickedCount: 1,
            },
          ]),
        },
      })
    })

    it('does not change clickedCount when same user queries the post again', async () => {
      await expect(query({ query: postQuery, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            {
              clickedCount: 1,
            },
          ]),
        },
      })
    })

    it('changes clickedCount when another user queries the post', async () => {
      authenticatedUser = await bUser.toJson()
      await expect(query({ query: postQuery, variables })).resolves.toMatchObject({
        data: {
          Post: expect.arrayContaining([
            {
              clickedCount: 2,
            },
          ]),
        },
      })
    })
  })
})

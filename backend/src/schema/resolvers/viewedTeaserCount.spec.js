import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { gql } from '../../helpers/jest'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'

const driver = getDriver()
const neode = getNeode()

let mutate
let authenticatedUser
let variables

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
      }
    },
  })
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

describe('count post teaser views', () => {
  let aUser, bUser
  const markTeaserAsViewed = gql`
    mutation ($id: ID!) {
      markTeaserAsViewed(id: $id) {
        id
        viewedTeaserCount
      }
    }
  `

  beforeAll(async () => {
    Factory.build('post', { id: 'post-to-be-viewed' })
    aUser = await Factory.build('user', { id: 'a-user' })
    bUser = await Factory.build('user', { id: 'b-user' })
    variables = {
      id: 'post-to-be-viewed',
    }
    authenticatedUser = await aUser.toJson()
  })

  it('marks the post as viewed and increases the viewedTeaserCount', async () => {
    await expect(mutate({ mutation: markTeaserAsViewed, variables })).resolves.toMatchObject({
      data: {
        markTeaserAsViewed: expect.objectContaining({
          viewedTeaserCount: 1,
        }),
      },
    })
  })

  it('does not increase the viewedTeaserCount when accidently called again', async () => {
    await expect(mutate({ mutation: markTeaserAsViewed, variables })).resolves.toMatchObject({
      data: {
        markTeaserAsViewed: expect.objectContaining({
          viewedTeaserCount: 1,
        }),
      },
    })
  })

  it('increases the viewedTeaserCount when viewed by another user', async () => {
    authenticatedUser = await bUser.toJson()
    await expect(mutate({ mutation: markTeaserAsViewed, variables })).resolves.toMatchObject({
      data: {
        markTeaserAsViewed: expect.objectContaining({
          viewedTeaserCount: 2,
        }),
      },
    })
  })
})

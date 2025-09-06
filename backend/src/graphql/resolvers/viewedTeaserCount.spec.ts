/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createTestClient } from 'apollo-server-testing'

import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import { markTeaserAsViewed } from '@graphql/queries/markTeaserAsViewed'
import createServer from '@src/server'

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
  await driver.close()
})

describe('count post teaser views', () => {
  let aUser, bUser

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

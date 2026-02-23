/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'
import { markTeaserAsViewed } from '@graphql/queries/markTeaserAsViewed'
import { createApolloTestSetup } from '@root/test/helpers'

const driver = getDriver()

let mutate
let authenticatedUser
let variables

const contextFn = () => ({
  authenticatedUser,
})

beforeAll(async () => {
  await cleanDatabase()
  ;({ mutate } = await createApolloTestSetup({ context: contextFn }))
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

  it('does not increase the viewedTeaserCount when accidentally called again', async () => {
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

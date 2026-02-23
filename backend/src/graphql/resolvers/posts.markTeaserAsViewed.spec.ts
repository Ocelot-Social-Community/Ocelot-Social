/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import { markTeaserAsViewed } from '@graphql/queries/markTeaserAsViewed'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let variables

const contextFn = () => ({
  authenticatedUser,
})

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context: contextFn })
  mutate = apolloSetup.mutate
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('count post teaser views', () => {
  let aUser, bUser

  beforeAll(async () => {
    await Factory.build('post', { id: 'post-to-be-viewed' })
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

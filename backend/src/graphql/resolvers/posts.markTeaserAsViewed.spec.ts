/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import { markTeaserAsViewed } from '@graphql/queries/markTeaserAsViewed'
import createServer from '@src/server'

const driver = getDriver()
const neode = getNeode()

let mutate
let authenticatedUser
let variables

const contextFn = () => ({
  driver,
  neode,
  user: authenticatedUser,
})

beforeAll(async () => {
  await cleanDatabase()

  const { server } = await createServer({
    context: async () => contextFn(),
  })
  const query = async (opts) => {
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
  mutate = async (opts) => query({ query: opts.mutation, variables: opts.variables })
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

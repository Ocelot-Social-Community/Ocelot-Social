/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing'

import { cleanDatabase } from '@db/factories'
import { getDriver, getNeode } from '@db/neo4j'
import { availableRoles } from '@graphql/queries/availableRoles'
import createServer from '@src/server'

const instance = getNeode()
const driver = getDriver()

describe('availableRoles', () => {
  let query: ApolloServerTestClient['query']

  beforeAll(async () => {
    await cleanDatabase()

    const { server } = createServer({
      context: () => {
        return {
          driver,
          neode: instance,
          user: null,
        }
      },
    })
    query = createTestClient(server).query
  })

  afterAll(async () => {
    await cleanDatabase()
    await driver.close()
  })

  it('returns available roles', async () => {
    const { data, errors } = await query({ query: availableRoles })
    expect(errors).toBeUndefined()
    expect(data?.availableRoles).toEqual(['admin', 'moderator', 'user'])
  })
})

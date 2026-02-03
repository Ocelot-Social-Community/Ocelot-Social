/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing'

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver, getNeode } from '@db/neo4j'
import { availableRoles } from '@graphql/queries/availableRoles'
import createServer from '@src/server'

const instance = getNeode()
const driver = getDriver()

describe('availableRoles', () => {
  let authenticatedUser
  let query: ApolloServerTestClient['query']

  beforeAll(async () => {
    await cleanDatabase()

    const { server } = createServer({
      context: () => {
        return {
          driver,
          neode: instance,
          user: authenticatedUser,
        }
      },
    })
    query = createTestClient(server).query
  })

  afterAll(async () => {
    await cleanDatabase()
    await driver.close()
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      const { data, errors } = await query({ query: availableRoles })
      expect(data).toEqual({ availableRoles: null })
      expect(errors).toEqual([expect.objectContaining({ message: 'Not Authorized!' })])
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      const currentUser = await Factory.build(
        'user',
        { id: 'current-user-id', role: 'user' },
        { email: 'test@example.org', password: '1234' },
      )
      authenticatedUser = await currentUser.toJson()
    })

    it('returns available roles', async () => {
      const { data, errors } = await query({ query: availableRoles })
      expect(errors).toBeUndefined()
      expect(data?.availableRoles).toEqual(['admin', 'moderator', 'user'])
    })
  })
})

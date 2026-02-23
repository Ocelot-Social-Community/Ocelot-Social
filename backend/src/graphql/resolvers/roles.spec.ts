/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Factory, { cleanDatabase } from '@db/factories'
import { availableRoles } from '@graphql/queries/availableRoles'
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

describe('availableRoles', () => {
  beforeAll(async () => {
    await cleanDatabase()
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

  afterEach(async () => {
    await cleanDatabase()
  })

  describe('unauthenticated', () => {
    it('throws authorization error', async () => {
      authenticatedUser = null
      const { data, errors } = await query({ query: availableRoles })
      expect(data).toEqual(null)
      expect(errors).toEqual([expect.objectContaining({ message: 'Not Authorized!' })])
    })
  })

  describe('authenticated', () => {
    describe('as user', () => {
      beforeEach(async () => {
        const user = await Factory.build(
          'user',
          { id: 'user-id', role: 'user' },
          { email: 'user@example.org', password: '1234' },
        )
        authenticatedUser = await user.toJson()
      })

      it('throws authorization error', async () => {
        const { data, errors } = await query({ query: availableRoles })
        expect(data).toEqual(null)
        expect(errors).toEqual([expect.objectContaining({ message: 'Not Authorized!' })])
      })
    })

    describe('as moderator', () => {
      beforeEach(async () => {
        const moderator = await Factory.build(
          'user',
          { id: 'moderator-id', role: 'moderator' },
          { email: 'moderator@example.org', password: '1234' },
        )
        authenticatedUser = await moderator.toJson()
      })

      it('throws authorization error', async () => {
        const { data, errors } = await query({ query: availableRoles })
        expect(data).toEqual(null)
        expect(errors).toEqual([expect.objectContaining({ message: 'Not Authorized!' })])
      })
    })

    describe('as admin', () => {
      beforeEach(async () => {
        const admin = await Factory.build(
          'user',
          { id: 'admin-id', role: 'admin' },
          { email: 'admin@example.org', password: '1234' },
        )
        authenticatedUser = await admin.toJson()
      })

      it('returns available roles', async () => {
        const { data, errors } = await query({ query: availableRoles })
        expect(errors).toBeUndefined()
        expect(data?.availableRoles).toEqual(['admin', 'moderator', 'user'])
      })
    })
  })
})

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
// Integration test for the `policy` query — runs through the real schema +
// permissions middleware (the layer that rejects a resolver returning
// `undefined`). Guards the viewer-scoped visibility: anonymous viewers get
// `null` for authenticated-only keys (NOT the value, and NOT an error).
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let config: Partial<Context['config']>
const context = () => ({ authenticatedUser, config })

let query: ApolloTestSetup['query']
let server: ApolloTestSetup['server']
let database: ApolloTestSetup['database']

const POLICY_QUERY = `
  query {
    policy {
      publicRegistration
      inviteRegistration
      categoriesActive
      apiKeysEnabled
    }
  }
`

const asUser = (role: string) => ({ id: `${role}-1`, role }) as unknown as Context['user']

beforeAll(async () => {
  const setup = await createApolloTestSetup({ context })
  query = setup.query
  server = setup.server
  database = setup.database
})

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

beforeEach(() => {
  authenticatedUser = null
  // apiKeysEnabled is "authenticated"-visibility; the value is true here so we
  // can tell "null because not visible" apart from "false because that's the value".
  config = { API_KEYS_ENABLED: true, CATEGORIES_ACTIVE: true }
})

describe('Query.policy', () => {
  describe('anonymous viewer', () => {
    it('returns public keys but null for the authenticated-only apiKeysEnabled, without error', async () => {
      authenticatedUser = null

      const { data, errors } = await query({ query: POLICY_QUERY })

      expect(errors).toBeUndefined()
      expect(data.policy).toEqual({
        publicRegistration: false,
        inviteRegistration: true,
        categoriesActive: true,
        apiKeysEnabled: null,
      })
    })
  })

  describe('logged-in (non-admin) viewer', () => {
    it('exposes the apiKeysEnabled value', async () => {
      authenticatedUser = asUser('user')

      const { data, errors } = await query({ query: POLICY_QUERY })

      expect(errors).toBeUndefined()
      expect(data.policy.apiKeysEnabled).toBe(true)
    })

    it('returns the real value (false), not null, when the feature is disabled', async () => {
      authenticatedUser = asUser('user')
      config = { API_KEYS_ENABLED: false }

      const { data } = await query({ query: POLICY_QUERY })

      expect(data.policy.apiKeysEnabled).toBe(false)
    })
  })

  describe('admin viewer', () => {
    it('exposes the apiKeysEnabled value (superuser sees everything)', async () => {
      authenticatedUser = asUser('admin')

      const { data, errors } = await query({ query: POLICY_QUERY })

      expect(errors).toBeUndefined()
      expect(data.policy.apiKeysEnabled).toBe(true)
    })
  })
})

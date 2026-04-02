/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'
import gql from 'graphql-tag'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
const context = () => ({
  authenticatedUser,
  config: { API_KEYS_ENABLED: true, API_KEYS_MAX_PER_USER: 3 },
})
let query: ApolloTestSetup['query']
let mutate: ApolloTestSetup['mutate']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const CREATE_API_KEY = gql`
  mutation ($name: String!, $expiresInDays: Int) {
    createApiKey(name: $name, expiresInDays: $expiresInDays) {
      apiKey { id name keyPrefix createdAt expiresAt disabled }
      secret
    }
  }
`
const MY_API_KEYS = gql`
  query { myApiKeys { id name keyPrefix createdAt lastUsedAt expiresAt disabled } }
`
const REVOKE_API_KEY = gql`
  mutation ($id: ID!) { revokeApiKey(id: $id) }
`
const UPDATE_API_KEY = gql`
  mutation ($id: ID!, $name: String!) { updateApiKey(id: $id, name: $name) { id name } }
`
const ADMIN_REVOKE_API_KEY = gql`
  mutation ($id: ID!) { adminRevokeApiKey(id: $id) }
`
const ADMIN_REVOKE_USER_API_KEYS = gql`
  mutation ($userId: ID!) { adminRevokeUserApiKeys(userId: $userId) }
`
const ALL_API_KEYS = gql`
  query ($orderBy: ApiKeyOrder, $first: Int, $offset: Int) {
    allApiKeys(orderBy: $orderBy, first: $first, offset: $offset) {
      apiKey { id name keyPrefix disabled }
      owner { id name slug }
      postsCount
      commentsCount
    }
  }
`

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
  query = apolloSetup.query
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

afterEach(async () => {
  await cleanDatabase()
})

describe('createApiKey', () => {
  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      const { errors } = await mutate({
        mutation: CREATE_API_KEY,
        variables: { name: 'Test Key' },
      })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })
  })

  describe('authenticated', () => {
    beforeEach(async () => {
      const user = await database.neode.create('User', {
        id: 'u1',
        name: 'Test User',
        slug: 'test-user',
        role: 'user',
      })
      authenticatedUser = (await user.toJson()) as Context['user']
    })

    it('creates an API key and returns secret', async () => {
      const { data, errors } = await mutate({
        mutation: CREATE_API_KEY,
        variables: { name: 'My CI Key' },
      })
      expect(errors).toBeUndefined()
      expect(data.createApiKey.secret).toMatch(/^oak_/)
      expect(data.createApiKey.apiKey).toMatchObject({
        name: 'My CI Key',
        disabled: false,
      })
      expect(data.createApiKey.apiKey.keyPrefix).toMatch(/^oak_/)
    })

    it('creates a key with expiry', async () => {
      const { data, errors } = await mutate({
        mutation: CREATE_API_KEY,
        variables: { name: 'Expiring Key', expiresInDays: 30 },
      })
      expect(errors).toBeUndefined()
      expect(data.createApiKey.apiKey.expiresAt).toBeTruthy()
    })

    it('creates a key without expiry', async () => {
      const { data, errors } = await mutate({
        mutation: CREATE_API_KEY,
        variables: { name: 'Permanent Key' },
      })
      expect(errors).toBeUndefined()
      expect(data.createApiKey.apiKey.expiresAt).toBeNull()
    })

    it('enforces max keys per user', async () => {
      await mutate({ mutation: CREATE_API_KEY, variables: { name: 'Key 1' } })
      await mutate({ mutation: CREATE_API_KEY, variables: { name: 'Key 2' } })
      await mutate({ mutation: CREATE_API_KEY, variables: { name: 'Key 3' } })
      const { errors } = await mutate({
        mutation: CREATE_API_KEY,
        variables: { name: 'Key 4' },
      })
      expect(errors?.[0].message).toContain('Maximum of 3 active API keys reached')
    })
  })

  describe('API keys disabled', () => {
    beforeEach(async () => {
      const user = await database.neode.create('User', {
        id: 'u-disabled',
        name: 'Disabled User',
        slug: 'disabled-user',
        role: 'user',
      })
      authenticatedUser = (await user.toJson()) as Context['user']
    })

    it('throws error when feature is disabled', async () => {
      const contextDisabled = () => ({
        authenticatedUser,
        config: { API_KEYS_ENABLED: false, API_KEYS_MAX_PER_USER: 5 },
      })
      const setup = await createApolloTestSetup({ context: contextDisabled })
      const { errors } = await setup.mutate({
        mutation: CREATE_API_KEY,
        variables: { name: 'Should Fail' },
      })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
      void setup.server.stop()
      void setup.database.driver.close()
      setup.database.neode.close()
    })
  })
})

describe('myApiKeys', () => {
  describe('authenticated', () => {
    beforeEach(async () => {
      const user = await database.neode.create('User', {
        id: 'u2',
        name: 'Key Owner',
        slug: 'key-owner',
        role: 'user',
      })
      authenticatedUser = (await user.toJson()) as Context['user']
    })

    it('returns empty list when no keys exist', async () => {
      const { data, errors } = await query({ query: MY_API_KEYS })
      expect(errors).toBeUndefined()
      expect(data.myApiKeys).toEqual([])
    })

    it('returns created keys', async () => {
      await mutate({ mutation: CREATE_API_KEY, variables: { name: 'Key A' } })
      await mutate({ mutation: CREATE_API_KEY, variables: { name: 'Key B' } })
      const { data, errors } = await query({ query: MY_API_KEYS })
      expect(errors).toBeUndefined()
      expect(data.myApiKeys).toHaveLength(2)
      expect(data.myApiKeys.map((k) => k.name)).toContain('Key A')
      expect(data.myApiKeys.map((k) => k.name)).toContain('Key B')
    })
  })
})

describe('revokeApiKey', () => {
  let keyId: string

  beforeEach(async () => {
    const user = await database.neode.create('User', {
      id: 'u3',
      name: 'Revoker',
      slug: 'revoker',
      role: 'user',
    })
    authenticatedUser = (await user.toJson()) as Context['user']
    const { data } = await mutate({
      mutation: CREATE_API_KEY,
      variables: { name: 'To Revoke' },
    })
    keyId = data.createApiKey.apiKey.id
  })

  it('revokes own key', async () => {
    const { data, errors } = await mutate({
      mutation: REVOKE_API_KEY,
      variables: { id: keyId },
    })
    expect(errors).toBeUndefined()
    expect(data.revokeApiKey).toBe(true)
  })

  it('revoked key shows as disabled in list', async () => {
    await mutate({ mutation: REVOKE_API_KEY, variables: { id: keyId } })
    const { data } = await query({ query: MY_API_KEYS })
    const revokedKey = data.myApiKeys.find((k) => k.id === keyId)
    expect(revokedKey.disabled).toBe(true)
  })
})

describe('updateApiKey', () => {
  let keyId: string

  beforeEach(async () => {
    const user = await database.neode.create('User', {
      id: 'u4',
      name: 'Updater',
      slug: 'updater',
      role: 'user',
    })
    authenticatedUser = (await user.toJson()) as Context['user']
    const { data } = await mutate({
      mutation: CREATE_API_KEY,
      variables: { name: 'Original Name' },
    })
    keyId = data.createApiKey.apiKey.id
  })

  it('renames a key', async () => {
    const { data, errors } = await mutate({
      mutation: UPDATE_API_KEY,
      variables: { id: keyId, name: 'New Name' },
    })
    expect(errors).toBeUndefined()
    expect(data.updateApiKey.name).toBe('New Name')
  })
})

describe('admin operations', () => {
  let regularUser, adminUser
  let keyId: string

  beforeEach(async () => {
    regularUser = await database.neode.create('User', {
      id: 'u-regular',
      name: 'Regular',
      slug: 'regular',
      role: 'user',
    })
    adminUser = await database.neode.create('User', {
      id: 'u-admin',
      name: 'Admin',
      slug: 'admin',
      role: 'admin',
    })

    // Create key as regular user
    authenticatedUser = (await regularUser.toJson()) as Context['user']
    const { data } = await mutate({
      mutation: CREATE_API_KEY,
      variables: { name: 'Regular Key' },
    })
    keyId = data.createApiKey.apiKey.id
  })

  describe('adminRevokeApiKey', () => {
    it('non-admin cannot revoke', async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      const { errors } = await mutate({
        mutation: ADMIN_REVOKE_API_KEY,
        variables: { id: keyId },
      })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('admin can revoke any key', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data, errors } = await mutate({
        mutation: ADMIN_REVOKE_API_KEY,
        variables: { id: keyId },
      })
      expect(errors).toBeUndefined()
      expect(data.adminRevokeApiKey).toBe(true)
    })
  })

  describe('adminRevokeUserApiKeys', () => {
    beforeEach(async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      await mutate({ mutation: CREATE_API_KEY, variables: { name: 'Key 2' } })
    })

    it('admin can revoke all keys of a user', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data, errors } = await mutate({
        mutation: ADMIN_REVOKE_USER_API_KEYS,
        variables: { userId: 'u-regular' },
      })
      expect(errors).toBeUndefined()
      expect(data.adminRevokeUserApiKeys).toBe(2)
    })
  })

  describe('allApiKeys', () => {
    it('non-admin cannot access', async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      const { errors } = await query({
        query: ALL_API_KEYS,
        variables: { orderBy: 'CREATED_AT', first: 10, offset: 0 },
      })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('admin sees all keys with activity', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data, errors } = await query({
        query: ALL_API_KEYS,
        variables: { orderBy: 'CREATED_AT', first: 10, offset: 0 },
      })
      expect(errors).toBeUndefined()
      expect(data.allApiKeys.length).toBeGreaterThanOrEqual(1)
      expect(data.allApiKeys[0]).toHaveProperty('apiKey')
      expect(data.allApiKeys[0]).toHaveProperty('owner')
      expect(data.allApiKeys[0]).toHaveProperty('postsCount')
      expect(data.allApiKeys[0]).toHaveProperty('commentsCount')
    })
  })
})

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { cleanDatabase } from '@db/factories'
import adminRevokeApiKey from '@graphql/queries/apiKeys/adminRevokeApiKey.gql'
import adminRevokeUserApiKeys from '@graphql/queries/apiKeys/adminRevokeUserApiKeys.gql'
import apiKeysForUser from '@graphql/queries/apiKeys/apiKeysForUser.gql'
import apiKeyUsers from '@graphql/queries/apiKeys/apiKeyUsers.gql'
import createApiKey from '@graphql/queries/apiKeys/createApiKey.gql'
import myApiKeys from '@graphql/queries/apiKeys/myApiKeys.gql'
import revokeApiKey from '@graphql/queries/apiKeys/revokeApiKey.gql'
import updateApiKey from '@graphql/queries/apiKeys/updateApiKey.gql'
import { createApolloTestSetup } from '@root/test/helpers'

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
        mutation: createApiKey,
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

    it('creates an API key and returns secret with oak_ prefix', async () => {
      const { data, errors } = await mutate({
        mutation: createApiKey,
        variables: { name: 'My CI Key' },
      })
      expect(errors).toBeUndefined()
      expect(data.createApiKey.secret).toMatch(/^oak_/)
      expect(data.createApiKey.apiKey).toMatchObject({
        name: 'My CI Key',
        disabled: false,
        disabledAt: null,
        lastUsedAt: null,
      })
      expect(data.createApiKey.apiKey.keyPrefix).toMatch(/^oak_/)
      expect(data.createApiKey.apiKey.id).toBeTruthy()
      expect(data.createApiKey.apiKey.createdAt).toBeTruthy()
    })

    it('creates a key with expiry', async () => {
      const { data, errors } = await mutate({
        mutation: createApiKey,
        variables: { name: 'Expiring Key', expiresInDays: 30 },
      })
      expect(errors).toBeUndefined()
      expect(data.createApiKey.apiKey.expiresAt).toBeTruthy()
    })

    it('creates a key without expiry', async () => {
      const { data, errors } = await mutate({
        mutation: createApiKey,
        variables: { name: 'Permanent Key' },
      })
      expect(errors).toBeUndefined()
      expect(data.createApiKey.apiKey.expiresAt).toBeNull()
    })

    it('enforces max keys per user', async () => {
      await mutate({ mutation: createApiKey, variables: { name: 'Key 1' } })
      await mutate({ mutation: createApiKey, variables: { name: 'Key 2' } })
      await mutate({ mutation: createApiKey, variables: { name: 'Key 3' } })
      const { errors } = await mutate({
        mutation: createApiKey,
        variables: { name: 'Key 4' },
      })
      expect(errors?.[0].message).toContain('Maximum of 3 active API keys reached')
    })

    it('does not count revoked keys towards the limit', async () => {
      const { data: k1 } = await mutate({ mutation: createApiKey, variables: { name: 'Key 1' } })
      await mutate({ mutation: createApiKey, variables: { name: 'Key 2' } })
      await mutate({ mutation: createApiKey, variables: { name: 'Key 3' } })
      // Revoke one
      await mutate({ mutation: revokeApiKey, variables: { id: k1.createApiKey.apiKey.id } })
      // Should succeed now
      const { errors } = await mutate({ mutation: createApiKey, variables: { name: 'Key 4' } })
      expect(errors).toBeUndefined()
    })
  })

  describe('API keys disabled', () => {
    it('throws error when feature is disabled', async () => {
      const user = await database.neode.create('User', {
        id: 'u-disabled',
        name: 'Disabled User',
        slug: 'disabled-user',
        role: 'user',
      })
      authenticatedUser = (await user.toJson()) as Context['user']
      const contextDisabled = () => ({
        authenticatedUser,
        config: { API_KEYS_ENABLED: false, API_KEYS_MAX_PER_USER: 5 },
      })
      const setup = await createApolloTestSetup({ context: contextDisabled })
      const { errors } = await setup.mutate({
        mutation: createApiKey,
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
    const { data, errors } = await query({ query: myApiKeys })
    expect(errors).toBeUndefined()
    expect(data.myApiKeys).toEqual([])
  })

  it('returns created keys ordered by createdAt desc', async () => {
    await mutate({ mutation: createApiKey, variables: { name: 'Key A' } })
    await mutate({ mutation: createApiKey, variables: { name: 'Key B' } })
    const { data, errors } = await query({ query: myApiKeys })
    expect(errors).toBeUndefined()
    expect(data.myApiKeys).toHaveLength(2)
    // Most recent first
    expect(data.myApiKeys[0].name).toBe('Key B')
    expect(data.myApiKeys[1].name).toBe('Key A')
  })

  it('includes revoked keys', async () => {
    const { data: created } = await mutate({
      mutation: createApiKey,
      variables: { name: 'To Revoke' },
    })
    await mutate({ mutation: revokeApiKey, variables: { id: created.createApiKey.apiKey.id } })
    const { data } = await query({ query: myApiKeys })
    expect(data.myApiKeys).toHaveLength(1)
    expect(data.myApiKeys[0].disabled).toBe(true)
    expect(data.myApiKeys[0].disabledAt).toBeTruthy()
  })
})

describe('updateApiKey', () => {
  let keyId: string

  beforeEach(async () => {
    const user = await database.neode.create('User', {
      id: 'u3',
      name: 'Updater',
      slug: 'updater',
      role: 'user',
    })
    authenticatedUser = (await user.toJson()) as Context['user']
    const { data } = await mutate({ mutation: createApiKey, variables: { name: 'Original' } })
    keyId = data.createApiKey.apiKey.id
  })

  it('renames a key', async () => {
    const { data, errors } = await mutate({
      mutation: updateApiKey,
      variables: { id: keyId, name: 'Renamed' },
    })
    expect(errors).toBeUndefined()
    expect(data.updateApiKey.name).toBe('Renamed')
  })

  it('throws error for nonexistent key', async () => {
    const { errors } = await mutate({
      mutation: updateApiKey,
      variables: { id: 'nonexistent', name: 'Fail' },
    })
    expect(errors?.[0].message).toContain('API key not found')
  })
})

describe('revokeApiKey', () => {
  let keyId: string

  beforeEach(async () => {
    const user = await database.neode.create('User', {
      id: 'u4',
      name: 'Revoker',
      slug: 'revoker',
      role: 'user',
    })
    authenticatedUser = (await user.toJson()) as Context['user']
    const { data } = await mutate({ mutation: createApiKey, variables: { name: 'To Revoke' } })
    keyId = data.createApiKey.apiKey.id
  })

  it('revokes own key', async () => {
    const { data, errors } = await mutate({ mutation: revokeApiKey, variables: { id: keyId } })
    expect(errors).toBeUndefined()
    expect(data.revokeApiKey).toBe(true)
  })

  it('sets disabledAt on revoked key', async () => {
    await mutate({ mutation: revokeApiKey, variables: { id: keyId } })
    const { data } = await query({ query: myApiKeys })
    const revoked = data.myApiKeys.find((k) => k.id === keyId)
    expect(revoked.disabled).toBe(true)
    expect(revoked.disabledAt).toBeTruthy()
  })

  it('returns false for nonexistent key', async () => {
    const { data } = await mutate({ mutation: revokeApiKey, variables: { id: 'nonexistent' } })
    expect(data.revokeApiKey).toBe(false)
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
    authenticatedUser = (await regularUser.toJson()) as Context['user']
    const { data } = await mutate({ mutation: createApiKey, variables: { name: 'Regular Key' } })
    keyId = data.createApiKey.apiKey.id
  })

  describe('adminRevokeApiKey', () => {
    it('non-admin cannot revoke', async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      const { errors } = await mutate({ mutation: adminRevokeApiKey, variables: { id: keyId } })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('admin can revoke any key', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data, errors } = await mutate({
        mutation: adminRevokeApiKey,
        variables: { id: keyId },
      })
      expect(errors).toBeUndefined()
      expect(data.adminRevokeApiKey).toBe(true)
    })
  })

  describe('adminRevokeUserApiKeys', () => {
    beforeEach(async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      await mutate({ mutation: createApiKey, variables: { name: 'Key 2' } })
    })

    it('non-admin cannot bulk revoke', async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      const { errors } = await mutate({
        mutation: adminRevokeUserApiKeys,
        variables: { userId: 'u-regular' },
      })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('admin can revoke all keys of a user', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data, errors } = await mutate({
        mutation: adminRevokeUserApiKeys,
        variables: { userId: 'u-regular' },
      })
      expect(errors).toBeUndefined()
      expect(data.adminRevokeUserApiKeys).toBe(2)
    })

    it('returns 0 when user has no active keys', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data } = await mutate({
        mutation: adminRevokeUserApiKeys,
        variables: { userId: 'u-admin' },
      })
      expect(data.adminRevokeUserApiKeys).toBe(0)
    })
  })

  describe('apiKeyUsers', () => {
    it('non-admin cannot access', async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      const { errors } = await query({ query: apiKeyUsers, variables: { first: 10, offset: 0 } })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('admin sees users with key stats', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data, errors } = await query({
        query: apiKeyUsers,
        variables: { first: 10, offset: 0 },
      })
      expect(errors).toBeUndefined()
      expect(data.apiKeyUsers.length).toBeGreaterThanOrEqual(1)
      const entry = data.apiKeyUsers.find((e) => e.user.id === 'u-regular')
      expect(entry).toBeTruthy()
      expect(entry.activeCount).toBe(2)
      expect(entry.revokedCount).toBe(0)
      expect(entry).toHaveProperty('postsCount')
      expect(entry).toHaveProperty('commentsCount')
    })

    it('counts active and revoked keys correctly', async () => {
      // Revoke one of regular's keys
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      await mutate({ mutation: adminRevokeApiKey, variables: { id: keyId } })
      const { data } = await query({ query: apiKeyUsers, variables: { first: 10, offset: 0 } })
      const entry = data.apiKeyUsers.find((e) => e.user.id === 'u-regular')
      expect(entry.activeCount).toBe(1)
      expect(entry.revokedCount).toBe(1)
    })

    it('supports pagination', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data } = await query({ query: apiKeyUsers, variables: { first: 1, offset: 0 } })
      expect(data.apiKeyUsers).toHaveLength(1)
    })
  })

  describe('apiKeysForUser', () => {
    it('non-admin cannot access', async () => {
      authenticatedUser = (await regularUser.toJson()) as Context['user']
      const { errors } = await query({
        query: apiKeysForUser,
        variables: { userId: 'u-regular' },
      })
      expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
    })

    it('admin sees all keys for a user', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data, errors } = await query({
        query: apiKeysForUser,
        variables: { userId: 'u-regular' },
      })
      expect(errors).toBeUndefined()
      expect(data.apiKeysForUser).toHaveLength(2)
      data.apiKeysForUser.forEach((k) => {
        expect(k).toHaveProperty('id')
        expect(k).toHaveProperty('name')
        expect(k).toHaveProperty('keyPrefix')
        expect(k).toHaveProperty('disabled')
        expect(k).toHaveProperty('disabledAt')
        expect(k).toHaveProperty('lastUsedAt')
        expect(k).toHaveProperty('expiresAt')
      })
    })

    it('returns active keys before revoked keys', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      await mutate({ mutation: adminRevokeApiKey, variables: { id: keyId } })
      const { data } = await query({ query: apiKeysForUser, variables: { userId: 'u-regular' } })
      expect(data.apiKeysForUser[0].disabled).toBe(false)
      expect(data.apiKeysForUser[1].disabled).toBe(true)
    })

    it('returns empty array for user without keys', async () => {
      authenticatedUser = (await adminUser.toJson()) as Context['user']
      const { data } = await query({ query: apiKeysForUser, variables: { userId: 'u-admin' } })
      expect(data.apiKeysForUser).toEqual([])
    })
  })
})

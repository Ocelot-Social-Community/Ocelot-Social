/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, security/detect-object-injection */
// Integration test for the `policy` query — runs through the real schema +
// permissions middleware (the layer that rejects a resolver returning
// `undefined`). Guards the viewer-scoped visibility: anonymous viewers get
// `null` for authenticated-only keys (NOT the value, and NOT an error).
import { PubSub } from 'graphql-subscriptions'

import policyQuery from '@graphql/queries/policy/policy.gql'
import policyDefaultsQuery from '@graphql/queries/policy/policyDefaults.gql'
import policyLastChangeQuery from '@graphql/queries/policy/policyLastChange.gql'
import resetPolicyMutation from '@graphql/queries/policy/resetPolicy.gql'
import setPolicyMutation from '@graphql/queries/policy/setPolicy.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { POLICY_CHANGED_CHANNEL } from '@src/policy'

import policyResolvers from './policy'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let config: Partial<Context['config']>
const context = () => ({ authenticatedUser, config })

let query: ApolloTestSetup['query']
let server: ApolloTestSetup['server']
let database: ApolloTestSetup['database']

const asUser = (role: string) => ({ id: `${role}-1`, role }) as unknown as Context['user']

const mutationContext = (policy: unknown): Context =>
  ({ user: { id: 'admin-1' }, policy }) as unknown as Context

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

      const { data, errors } = await query({ query: policyQuery })

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

      const { data, errors } = await query({ query: policyQuery })

      expect(errors).toBeUndefined()
      expect(data.policy.apiKeysEnabled).toBe(true)
    })

    it('returns the real value (false), not null, when the feature is disabled', async () => {
      authenticatedUser = asUser('user')
      config = { API_KEYS_ENABLED: false }

      const { data } = await query({ query: policyQuery })

      expect(data.policy.apiKeysEnabled).toBe(false)
    })
  })

  describe('admin viewer', () => {
    it('exposes the apiKeysEnabled value (superuser sees everything)', async () => {
      authenticatedUser = asUser('admin')

      const { data, errors } = await query({ query: policyQuery })

      expect(errors).toBeUndefined()
      expect(data.policy.apiKeysEnabled).toBe(true)
    })
  })
})

describe('Query.policyDefaults', () => {
  it('is forbidden for anonymous viewers', async () => {
    authenticatedUser = null

    const { errors } = await query({ query: policyDefaultsQuery })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })

  it('is forbidden for logged-in non-admin users', async () => {
    authenticatedUser = asUser('user')

    const { errors } = await query({ query: policyDefaultsQuery })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })

  it('grants access to admins and returns every key (admin sees all, none null)', async () => {
    authenticatedUser = asUser('admin')

    const { data, errors } = await query({ query: policyDefaultsQuery })

    expect(errors).toBeUndefined()
    // Admin sees all keys; the exact default value (schema vs ENV seed) is
    // covered deterministically in PolicyService.spec.ts → getDefault().
    for (const key of [
      'publicRegistration',
      'inviteRegistration',
      'categoriesActive',
      'apiKeysEnabled',
    ]) {
      expect(typeof data.policyDefaults[key]).toBe('boolean')
    }
  })
})

describe('Query.policyLastChange', () => {
  it('is forbidden for anonymous viewers', async () => {
    authenticatedUser = null

    const { errors } = await query({ query: policyLastChangeQuery })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })

  it('is forbidden for logged-in non-admin users', async () => {
    authenticatedUser = asUser('user')

    const { errors } = await query({ query: policyLastChangeQuery })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })

  it('returns null for admins when nothing has changed (fresh in-memory policy)', async () => {
    authenticatedUser = asUser('admin')

    const { data, errors } = await query({ query: policyLastChangeQuery })

    expect(errors).toBeUndefined()
    expect(data.policyLastChange).toBeNull()
  })
})

describe('Mutation.setPolicy / resetPolicy authorization', () => {
  it('forbids setPolicy for non-admins', async () => {
    authenticatedUser = asUser('user')

    const { errors } = await query({
      query: setPolicyMutation,
      variables: { key: 'apiKeysEnabled', value: 'true' },
    })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })

  it('forbids resetPolicy for anonymous viewers', async () => {
    authenticatedUser = null

    const { errors } = await query({
      query: resetPolicyMutation,
      variables: { key: 'apiKeysEnabled' },
    })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })
})

describe('Mutation resolvers (unit)', () => {
  describe('setPolicy', () => {
    it('parses the JSON value, calls policy.set, and serializes the event', async () => {
      const set = jest.fn().mockResolvedValue({
        key: 'apiKeysEnabled',
        value: true,
        actor: 'admin-1',
        timestamp: 'ts',
      })

      const result = await policyResolvers.Mutation.setPolicy(
        null,
        { key: 'apiKeysEnabled', value: 'true' },
        mutationContext({ set }),
      )

      expect(set).toHaveBeenCalledWith('apiKeysEnabled', true, 'admin-1')
      expect(result).toEqual({
        key: 'apiKeysEnabled',
        value: 'true',
        actor: 'admin-1',
        timestamp: 'ts',
      })
    })

    it('rejects a value that is not valid JSON', async () => {
      const set = jest.fn()

      await expect(
        policyResolvers.Mutation.setPolicy(
          null,
          { key: 'apiKeysEnabled', value: 'not json' },
          mutationContext({ set }),
        ),
      ).rejects.toThrow(/JSON-encoded string/)
      expect(set).not.toHaveBeenCalled()
    })
  })

  describe('resetPolicy', () => {
    it('calls policy.reset and serializes the event', async () => {
      const reset = jest.fn().mockResolvedValue({
        key: 'categoriesActive',
        value: false,
        actor: 'admin-1',
        timestamp: 'ts',
      })

      const result = await policyResolvers.Mutation.resetPolicy(
        null,
        { key: 'categoriesActive' },
        mutationContext({ reset }),
      )

      expect(reset).toHaveBeenCalledWith('categoriesActive', 'admin-1')
      expect(result.value).toBe('false')
    })
  })
})

describe('Subscription.policyChanged', () => {
  // The subscription shares its visibility mechanism (canView) with the query:
  // a change event is only delivered to a subscriber who may see the changed key.
  const subscriptionContext = (user: Context['user']) =>
    ({ pubsub: new PubSub(), user }) as unknown as Context

  const publish = async (pubsub: PubSub, key: string) =>
    pubsub.publish(POLICY_CHANGED_CHANNEL, {
      policyChanged: { key, value: true, actor: 'admin-1', timestamp: 'ts' },
    })

  it('delivers a visible key and serializes it via resolve()', async () => {
    const ctx = subscriptionContext(asUser('user'))
    const iterator = policyResolvers.Subscription.policyChanged.subscribe(null, null, ctx, null)
    const next = iterator.next()

    await publish(ctx.pubsub as unknown as PubSub, 'publicRegistration')

    const { value } = await next
    const resolved = policyResolvers.Subscription.policyChanged.resolve(value)
    expect(resolved).toEqual({
      key: 'publicRegistration',
      value: 'true',
      actor: 'admin-1',
      timestamp: 'ts',
    })
  })

  it('skips a key the viewer may not see and delivers the next visible one', async () => {
    const ctx = subscriptionContext(null) // anonymous
    const iterator = policyResolvers.Subscription.policyChanged.subscribe(null, null, ctx, null)
    const next = iterator.next()

    // apiKeysEnabled is authenticated-only → filtered out for an anonymous viewer.
    await publish(ctx.pubsub as unknown as PubSub, 'apiKeysEnabled')
    // publicRegistration is public → delivered.
    await publish(ctx.pubsub as unknown as PubSub, 'publicRegistration')

    const { value } = await next
    const resolved = policyResolvers.Subscription.policyChanged.resolve(value)
    expect(resolved.key).toBe('publicRegistration')
  })
})

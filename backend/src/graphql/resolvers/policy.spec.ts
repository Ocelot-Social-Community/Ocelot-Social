/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, security/detect-object-injection */
// Integration test for the `policy` query — runs through the real schema +
// permissions middleware (the layer that rejects a resolver returning
// `undefined`). Guards the viewer-scoped visibility: anonymous viewers get
// `null` for authenticated-only keys (NOT the value, and NOT an error).
import { parse } from 'graphql'
import { PubSub } from 'graphql-subscriptions'

import policyQuery from '@graphql/queries/policy/policy.gql'
import policyDefaultsQuery from '@graphql/queries/policy/policyDefaults.gql'
import resetPolicyMutation from '@graphql/queries/policy/resetPolicy.gql'
import setPolicyMutation from '@graphql/queries/policy/setPolicy.gql'
import { createApolloTestSetup } from '@root/test/helpers'
import { POLICY_CHANGED_CHANNEL, allKeys } from '@src/policy'
import { PERMISSIONS_CHANGED_CHANNEL } from '@src/role'

import policyResolvers from './policy'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'

let authenticatedUser: Context['user']
let policy: Partial<NetworkPolicy>
const context = () => ({ authenticatedUser, policy })

let query: ApolloTestSetup['query']
let server: ApolloTestSetup['server']
let database: ApolloTestSetup['database']

const asUser = (role: string) => ({ id: `${role}-1`, roleName: role }) as unknown as Context['user']

// The policy / policyDefaults queries return a key/value list (value JSON-encoded);
// fold it back into a key→value map for the assertions. Mirrors the frontend store's
// normalize(): a null value (key not visible / unset) stays null.
const asMap = (entries: Array<{ key: string; value: string | null }>) =>
  Object.fromEntries(
    entries.map(({ key, value }) => [key, value === null ? null : JSON.parse(value)]),
  )

const mutationContext = (policyDouble: unknown): Context =>
  ({ user: { id: 'admin-1' }, policy: policyDouble }) as unknown as Context

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
  policy = { apiKeysEnabled: true, categoriesActive: true }
})

describe('Query.policy', () => {
  describe('anonymous viewer', () => {
    it('returns public keys but null for the authenticated-only apiKeysEnabled, without error', async () => {
      authenticatedUser = null

      const { data, errors } = await query({ query: policyQuery })

      expect(errors).toBeUndefined()
      expect(asMap(data.policy)).toEqual({
        publicRegistration: false,
        inviteRegistration: true,
        askForRealName: false,
        requireLocation: false,
        categoriesActive: true,
        badgesEnabled: false,
        showContentFilterHeaderMenu: true,
        showContentFilterMasonryGrid: false,
        showGroupButtonInHeader: true,
        // authenticated-only keys → null for an anonymous viewer
        apiKeysEnabled: null,
        apiKeysMaxPerUser: null,
        maxPinnedPosts: null,
        maxGroupPinnedPosts: null,
        inviteLinkLimit: null,
        inviteCodesPersonalPerUser: null,
        inviteCodesGroupPerUser: null,
        // admin-only key → null for an anonymous viewer
        videoConference: null,
      })
    })
  })

  describe('logged-in (non-admin) viewer', () => {
    it('exposes the apiKeysEnabled value', async () => {
      authenticatedUser = asUser('user')

      const { data, errors } = await query({ query: policyQuery })

      expect(errors).toBeUndefined()
      expect(asMap(data.policy).apiKeysEnabled).toBe(true)
    })

    it('returns the real value (false), not null, when the feature is disabled', async () => {
      authenticatedUser = asUser('user')
      policy = { apiKeysEnabled: false }

      const { data } = await query({ query: policyQuery })

      expect(asMap(data.policy).apiKeysEnabled).toBe(false)
    })
  })

  describe('admin viewer', () => {
    it('exposes the apiKeysEnabled value (superuser sees everything)', async () => {
      authenticatedUser = asUser('admin')

      const { data, errors } = await query({ query: policyQuery })

      expect(errors).toBeUndefined()
      expect(asMap(data.policy).apiKeysEnabled).toBe(true)
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

  it('grants access to admins, returning every default and the last change', async () => {
    authenticatedUser = asUser('admin')

    const { data, errors } = await query({ query: policyDefaultsQuery })

    expect(errors).toBeUndefined()
    const defaults = asMap(data.policyDefaults.defaults)
    // Admin sees all keys; the exact default value (schema vs ENV seed) is
    // covered deterministically in PolicyService.spec.ts → getDefault().
    for (const key of [
      'publicRegistration',
      'inviteRegistration',
      'askForRealName',
      'requireLocation',
      'categoriesActive',
      'badgesEnabled',
      'apiKeysEnabled',
      'videoConference',
      'showContentFilterHeaderMenu',
      'showContentFilterMasonryGrid',
      'showGroupButtonInHeader',
    ]) {
      expect(typeof defaults[key]).toBe('boolean')
    }
    // Integer-typed policy keys come back as numbers (Int), not coerced booleans.
    for (const key of [
      'apiKeysMaxPerUser',
      'maxPinnedPosts',
      'maxGroupPinnedPosts',
      'inviteLinkLimit',
      'inviteCodesPersonalPerUser',
      'inviteCodesGroupPerUser',
    ]) {
      expect(typeof defaults[key]).toBe('number')
    }
    // lastChange is bundled here (replaces the former policyLastChange query);
    // null on a fresh in-memory policy with no human change yet.
    expect(data.policyDefaults.lastChange).toBeNull()
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

  it('forbids the bulk resetPolicies for non-admins', async () => {
    authenticatedUser = asUser('user')

    const { errors } = await query({
      query: parse('mutation { resetPolicies(keys: [apiKeysEnabled]) { key } }'),
    })

    expect(errors?.[0]).toHaveProperty('message', 'Not Authorized!')
  })

  it('lets the bulk resetPolicies past the shield for an admin (the gate is registered)', async () => {
    // A deny test alone would pass even if the mutation were MISSING from the shield (default
    // deny). This admin path is what catches a forgotten shield registration: an admin must
    // not be denied. (The harness policy service has no writable DB, so execution may still
    // error internally — that is a test-setup limitation, not what we assert here.)
    authenticatedUser = asUser('admin')

    const { errors } = await query({
      query: parse('mutation { resetPolicies(keys: [apiKeysEnabled]) { key } }'),
    })

    expect(errors?.[0]?.message).not.toBe('Not Authorized!')
  })
})

describe('PolicyKey enum (schema-derived contract)', () => {
  it('is derived from the schema keys — the single source of truth', async () => {
    const { data, errors } = await query({
      query: parse('{ __type(name: "PolicyKey") { enumValues { name } } }'),
    })
    expect(errors).toBeUndefined()
    const enumValues = data.__type.enumValues as Array<{ name: string }>
    const names = enumValues.map((v) => v.name).sort()
    expect(names).toEqual([...allKeys()].sort())
  })

  it('rejects an unknown key at the GraphQL layer (before the resolver)', async () => {
    authenticatedUser = asUser('admin')

    const { errors } = await query({
      query: setPolicyMutation,
      variables: { key: 'totallyMadeUpKey', value: 'true' },
    })

    // Enum coercion fails during variable validation — never reaches policy.set().
    expect(errors?.[0]?.message).toMatch(/PolicyKey/)
  })

  // The policy / policyDefaults queries return a key/value list keyed by the
  // PolicyKey enum (which the test above pins to allKeys()), so there is no longer
  // a hand-written Policy SDL type to drift from the schema keys — the former
  // "keep the Policy type fields in sync" guard is obsolete and was removed.
  it('returns every schema key in the policy list, with no hand-maintained selection', async () => {
    authenticatedUser = asUser('admin')

    const { data, errors } = await query({ query: policyQuery })

    expect(errors).toBeUndefined()
    const keys = (data.policy as Array<{ key: string }>).map((entry) => entry.key).sort()
    expect(keys).toEqual([...allKeys()].sort())
  })
})

describe('setPolicy value validation (integration)', () => {
  it('classifies a valid-JSON value of the wrong type as BAD_USER_INPUT', async () => {
    authenticatedUser = asUser('admin')

    // "123" is valid JSON (number) but apiKeysEnabled is boolean → schema mismatch.
    // It reaches policy.set() and must come back as a client input error, not as
    // a generic/internal error.
    const { errors } = await query({
      query: setPolicyMutation,
      variables: { key: 'apiKeysEnabled', value: '123' },
    })

    expect(errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
    expect(errors?.[0]?.message).toMatch(/must be boolean/)
  })

  it('classifies a non-integer value for an integer key as BAD_USER_INPUT', async () => {
    authenticatedUser = asUser('admin')

    // 1.5 is valid JSON but apiKeysMaxPerUser is integer → schema mismatch, surfaced
    // as a client input error rather than an internal one.
    const { errors } = await query({
      query: setPolicyMutation,
      variables: { key: 'apiKeysMaxPerUser', value: '1.5' },
    })

    expect(errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
    expect(errors?.[0]?.message).toMatch(/must be integer/)
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

    it('parses an integer JSON value for an integer key', async () => {
      const set = jest.fn().mockResolvedValue({
        key: 'apiKeysMaxPerUser',
        value: 10,
        actor: 'admin-1',
        timestamp: 'ts',
      })

      const result = await policyResolvers.Mutation.setPolicy(
        null,
        { key: 'apiKeysMaxPerUser', value: '10' },
        mutationContext({ set }),
      )

      expect(set).toHaveBeenCalledWith('apiKeysMaxPerUser', 10, 'admin-1')
      expect(result.value).toBe('10') // serialized back as a JSON-encoded string
    })

    it('rejects a value that is not valid JSON as a BAD_USER_INPUT error', async () => {
      const set = jest.fn()

      const promise = policyResolvers.Mutation.setPolicy(
        null,
        { key: 'apiKeysEnabled', value: 'not json' },
        mutationContext({ set }),
      )
      await expect(promise).rejects.toThrow(/JSON-encoded string/)
      // Classified as a client input error, not a generic/internal error.
      await expect(promise).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
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

  describe('resetPolicies (bulk)', () => {
    it('calls policy.resetMany once and serializes the returned events', async () => {
      const resetMany = jest.fn().mockResolvedValue([
        { key: 'categoriesActive', value: false, actor: 'admin-1', timestamp: 'ts' },
        { key: 'apiKeysMaxPerUser', value: 5, actor: 'admin-1', timestamp: 'ts' },
      ])

      const result = await policyResolvers.Mutation.resetPolicies(
        null,
        { keys: ['categoriesActive', 'apiKeysMaxPerUser'] },
        mutationContext({ resetMany }),
      )

      expect(resetMany).toHaveBeenCalledTimes(1)
      expect(resetMany).toHaveBeenCalledWith(['categoriesActive', 'apiKeysMaxPerUser'], 'admin-1')
      expect(result.map((r) => [r.key, r.value])).toEqual([
        ['categoriesActive', 'false'],
        ['apiKeysMaxPerUser', '5'],
      ])
    })
  })

  // A gate-flag change flips permission availability network-wide, so it must also
  // signal the permission system (clients refetch myPermissions + the roles catalog).
  describe('permissions-gate broadcast', () => {
    const ctxWithPubsub = (policyDouble: unknown, publish: jest.Mock): Context =>
      ({ user: { id: 'admin-1' }, policy: policyDouble, pubsub: { publish } }) as unknown as Context

    it('broadcasts permissionsChanged when setPolicy changes a gate flag', async () => {
      const set = jest.fn().mockResolvedValue({
        key: 'apiKeysEnabled',
        value: false,
        actor: 'admin-1',
        timestamp: 't',
      })
      const publish = jest.fn()
      await policyResolvers.Mutation.setPolicy(
        null,
        { key: 'apiKeysEnabled', value: 'false' },
        ctxWithPubsub({ set }, publish),
      )
      expect(publish).toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, {
        permissionsChanged: { roleName: null, previousRoleName: null },
      })
    })

    it('does NOT broadcast permissionsChanged for a non-gate policy key', async () => {
      const set = jest.fn().mockResolvedValue({
        key: 'apiKeysMaxPerUser',
        value: 7,
        actor: 'admin-1',
        timestamp: 't',
      })
      const publish = jest.fn()
      await policyResolvers.Mutation.setPolicy(
        null,
        { key: 'apiKeysMaxPerUser', value: '7' },
        ctxWithPubsub({ set }, publish),
      )
      expect(publish).not.toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, expect.anything())
    })

    it('broadcasts permissionsChanged when resetPolicy resets a gate flag', async () => {
      const reset = jest.fn().mockResolvedValue({
        key: 'apiKeysEnabled',
        value: false,
        actor: 'admin-1',
        timestamp: 't',
      })
      const publish = jest.fn()
      await policyResolvers.Mutation.resetPolicy(
        null,
        { key: 'apiKeysEnabled' },
        ctxWithPubsub({ reset }, publish),
      )
      expect(publish).toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, {
        permissionsChanged: { roleName: null, previousRoleName: null },
      })
    })

    it('broadcasts permissionsChanged once when a bulk reset changes a gate flag', async () => {
      const resetMany = jest.fn().mockResolvedValue([
        { key: 'publicRegistration', value: false, actor: 'admin-1', timestamp: 't' },
        { key: 'apiKeysEnabled', value: false, actor: 'admin-1', timestamp: 't' },
      ])
      const publish = jest.fn()
      await policyResolvers.Mutation.resetPolicies(
        null,
        { keys: ['publicRegistration', 'apiKeysEnabled'] },
        ctxWithPubsub({ resetMany }, publish),
      )
      const gateBroadcasts = publish.mock.calls.filter(
        ([channel]) => channel === PERMISSIONS_CHANGED_CHANNEL,
      )
      expect(gateBroadcasts).toHaveLength(1)
    })

    it('does NOT broadcast permissionsChanged when no reset gate flag actually changed', async () => {
      // apiKeysEnabled was requested but already at its default, so resetMany didn't return
      // it — no permission availability changed, no signal.
      const resetMany = jest
        .fn()
        .mockResolvedValue([
          { key: 'publicRegistration', value: false, actor: 'admin-1', timestamp: 't' },
        ])
      const publish = jest.fn()
      await policyResolvers.Mutation.resetPolicies(
        null,
        { keys: ['publicRegistration', 'apiKeysEnabled'] },
        ctxWithPubsub({ resetMany }, publish),
      )
      expect(publish).not.toHaveBeenCalledWith(PERMISSIONS_CHANGED_CHANNEL, expect.anything())
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

  it('delivers a visible key as a lean value-change event (key + value only)', async () => {
    const ctx = subscriptionContext(asUser('user'))
    const iterator = policyResolvers.Subscription.policyChanged.subscribe(null, null, ctx, null)
    const next = iterator.next()

    await publish(ctx.pubsub as unknown as PubSub, 'publicRegistration')

    const { value } = await next
    const resolved = policyResolvers.Subscription.policyChanged.resolve(value)
    // No actor/timestamp on the wire — last-change audit lives in policyDefaults.
    expect(resolved).toEqual({ key: 'publicRegistration', value: 'true' })
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

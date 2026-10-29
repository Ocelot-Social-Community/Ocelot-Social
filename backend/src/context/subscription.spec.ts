import { PubSub } from 'graphql-subscriptions'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import policyResolvers from '@graphql/resolvers/policy'
import { allKeys, audiencesFor, POLICY_CHANGED_CHANNEL } from '@src/policy'

import {
  listenForPrincipalChanges,
  principalEpoch,
  publishPrincipalChanged,
} from './principalEpoch'
import { getSubscriptionContext, SUBSCRIPTION_PRINCIPAL_TTL_MS } from './subscription'

import type { Context } from '@context/index'
import type { PermissionKey } from '@src/permission'

const req = { headers: { authorization: 'Bearer token' } }

// The viewer as the database answers for it right now; a test changes it to stand for a
// demotion, a disable or a database outage between two events.
let viewer: { id: string; permissions: PermissionKey[] } | null
let unreachable: boolean
let pubsub: PubSub
let principalListener: number
// Stands in for the RoleService singleton: only its change counter is read here.
const role = { version: 0 }
// Lets a test act while a read is under way.
let duringRead: () => void

const buildContext = vi.fn(async (): Promise<Context> => {
  if (unreachable) {
    return Promise.reject(new Error('database unreachable'))
  }
  const user = viewer && { id: viewer.id }
  duringRead()
  return Promise.resolve({
    pubsub,
    role,
    user,
    effectivePermissions: new Set(viewer?.permissions ?? []),
    cypherParams: { currentUserId: user?.id ?? null },
  } as unknown as Context)
})

const logger = { warn: vi.fn() }

const subscriptionContext = async () => getSubscriptionContext(req, { buildContext, logger })

const nextEvent = async (events: AsyncIterator<unknown>) => events.next()

beforeEach(async () => {
  // Only the clock: the window is measured with Date.now, and events need real ticks.
  vi.useFakeTimers({ toFake: ['Date'] })
  viewer = { id: 'u1', permissions: ['policy.manage'] }
  unreachable = false
  pubsub = new PubSub()
  principalListener = await listenForPrincipalChanges(pubsub)
  duringRead = () => undefined
  buildContext.mockClear()
  logger.warn.mockClear()
})

afterEach(() => {
  pubsub.unsubscribe(principalListener)
  vi.useRealTimers()
})

describe(getSubscriptionContext, () => {
  it('starts out as the context of the request it was opened with', async () => {
    const context = await subscriptionContext()

    expect(buildContext).toHaveBeenCalledWith(req)
    expect(context.user).toEqual({ id: 'u1' })
  })

  it('keeps the viewer for events within the window', async () => {
    const context = await subscriptionContext()
    const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
    viewer = null
    vi.advanceTimersByTime(SUBSCRIPTION_PRINCIPAL_TTL_MS - 1)
    const event = nextEvent(events)
    await pubsub.publish('channel', { n: 1 })

    expect(await event).toEqual({ done: false, value: { n: 1 } })
    expect(buildContext).toHaveBeenCalledTimes(1)
    expect(context.user).toEqual({ id: 'u1' })
  })

  describe('after the window', () => {
    it('reads the viewer again before the event, into the same object', async () => {
      const context = await subscriptionContext()
      const wrappedPubsub = context.pubsub
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      viewer = { id: 'u1', permissions: [] }
      vi.advanceTimersByTime(SUBSCRIPTION_PRINCIPAL_TTL_MS)
      const event = nextEvent(events)
      await pubsub.publish('channel', { n: 1 })
      await event

      expect(buildContext).toHaveBeenCalledTimes(2)
      expect(context.effectivePermissions).toEqual(new Set())
      // The fresh context brings the raw pubsub; the subscription keeps the refreshing one.
      expect(context.pubsub).toBe(wrappedPubsub)
    })

    it('turns a viewer the database no longer answers for into an anonymous one', async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      viewer = null
      vi.advanceTimersByTime(SUBSCRIPTION_PRINCIPAL_TTL_MS)
      const event = nextEvent(events)
      await pubsub.publish('channel', { n: 1 })
      await event

      expect(context.user).toBeNull()
      expect(context.cypherParams.currentUserId).toBeNull()
    })

    it('reads once for a burst of events and starts a new window', async () => {
      const context = await subscriptionContext()
      const first = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      const second = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      vi.advanceTimersByTime(SUBSCRIPTION_PRINCIPAL_TTL_MS)
      const events = [nextEvent(first), nextEvent(second)]
      await pubsub.publish('channel', { n: 1 })
      await Promise.all(events)

      expect(buildContext).toHaveBeenCalledTimes(2)

      const third = nextEvent(first)
      await pubsub.publish('channel', { n: 2 })
      await third

      expect(buildContext).toHaveBeenCalledTimes(2)
    })

    it('keeps the viewer when the read fails, and tries again with the next event', async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      unreachable = true
      vi.advanceTimersByTime(SUBSCRIPTION_PRINCIPAL_TTL_MS)
      const first = nextEvent(events)
      await pubsub.publish('channel', { n: 1 })

      expect(await first).toEqual({ done: false, value: { n: 1 } })
      expect(context.user).toEqual({ id: 'u1' })
      expect(logger.warn).toHaveBeenCalledWith(
        'Could not refresh the viewer of a subscription',
        expect.any(Error),
      )

      unreachable = false
      viewer = null
      const second = nextEvent(events)
      await pubsub.publish('channel', { n: 2 })
      await second

      expect(context.user).toBeNull()
    })
  })

  describe('within the window', () => {
    const deliver = async (events: AsyncIterator<unknown>) => {
      const event = nextEvent(events)
      await pubsub.publish('channel', { n: 1 })
      return event
    }

    const changePrincipal = async (userId: string) => {
      const before = principalEpoch(userId)
      publishPrincipalChanged(pubsub, userId)
      await vi.waitFor(() => {
        expect(principalEpoch(userId)).toBe(before + 1)
      })
    }

    it("reads the viewer again once the backend changed that user's principal", async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      viewer = null
      await changePrincipal('u1')
      await deliver(events)

      expect(context.user).toBeNull()
    })

    it("does not read the viewer again for another user's change", async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      await changePrincipal('u2')
      await deliver(events)

      expect(buildContext).toHaveBeenCalledTimes(1)
    })

    it('reads the viewer again once a role definition changed', async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      viewer = { id: 'u1', permissions: [] }
      role.version += 1
      await deliver(events)

      expect(context.effectivePermissions).toEqual(new Set())
    })

    it('reads an anonymous viewer again for a role definition only', async () => {
      viewer = null
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      await changePrincipal('u1')
      await deliver(events)

      expect(buildContext).toHaveBeenCalledTimes(1)

      role.version += 1
      await deliver(events)

      expect(buildContext).toHaveBeenCalledTimes(2)
    })

    // The epoch is counted under the id the token names, not under the viewer it last read.
    it('does not read a viewer that came back anonymous again with every event', async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      viewer = null
      await changePrincipal('u1')
      await deliver(events)
      await deliver(events)

      expect(buildContext).toHaveBeenCalledTimes(2)
    })

    it('reads a change that lands during a read with the next event', async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      role.version += 1
      duringRead = () => {
        duringRead = () => undefined
        role.version += 1
      }
      await deliver(events)
      await deliver(events)

      expect(buildContext).toHaveBeenCalledTimes(3)
    })
  })

  describe('pubsub', () => {
    it('publishes through the underlying pubsub', async () => {
      const context = await subscriptionContext()
      const raw = pubsub.asyncIterator('channel')
      const event = raw.next()
      await context.pubsub.publish('channel', { n: 1 })

      expect(await event).toEqual({ done: false, value: { n: 1 } })
    })

    it('ends the underlying iterator when the subscription ends', async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>

      expect(events[Symbol.asyncIterator]()).toBe(events)

      // One event first: PubSub's iterator subscribes on its first next(), and a return() that
      // overtakes that subscription leaves the next pull waiting on a fresh one.
      const first = events.next()
      await pubsub.publish('channel', { n: 1 })
      await first
      const pending = events.next()

      expect(await events.return?.()).toEqual({ done: true, value: undefined })
      expect(await pending).toEqual({ done: true, value: undefined })
    })

    it('hands an error thrown into the iterator to the underlying one', async () => {
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      const error = new Error('client gone')

      await expect(events.throw?.(error)).rejects.toBe(error)
    })

    it('answers return and throw itself for an iterator that has neither', async () => {
      const bare = { next: vi.fn() }
      vi.spyOn(pubsub, 'asyncIterator').mockReturnValue(bare as never)
      const context = await subscriptionContext()
      const events = context.pubsub.asyncIterator('channel') as AsyncIterableIterator<unknown>
      const error = new Error('client gone')

      expect(await events.return?.()).toEqual({ done: true, value: undefined })
      await expect(events.throw?.(error)).rejects.toBe(error)
    })
  })

  // The whole way through a real subscription: withFilter hands its filter the context it got
  // at subscribe time, so this only works because the refresh writes into that very object.
  it('stops showing a demoted admin the admin-only policy changes', async () => {
    const adminOnlyKey = allKeys().find((key) =>
      audiencesFor(key).every((audience) => audience === 'perm:policy.manage'),
    )
    const sharedKey = allKeys().find((key) => audiencesFor(key).includes('authenticated'))

    expect(adminOnlyKey && sharedKey).toBeDefined()

    const context = await subscriptionContext()
    const events = policyResolvers.Subscription.policyChanged.subscribe(
      undefined,
      {},
      context,
      undefined,
    ) as AsyncIterator<unknown>
    const adminOnlyChange = { policyChanged: { key: adminOnlyKey, value: true } }
    const sharedChange = { policyChanged: { key: sharedKey, value: true } }

    const asAdmin = events.next()
    await pubsub.publish(POLICY_CHANGED_CHANNEL, adminOnlyChange)

    expect(await asAdmin).toEqual({ done: false, value: adminOnlyChange })

    viewer = { id: 'u1', permissions: [] }
    vi.advanceTimersByTime(SUBSCRIPTION_PRINCIPAL_TTL_MS)
    const asUser = events.next()
    await pubsub.publish(POLICY_CHANGED_CHANNEL, adminOnlyChange)
    await pubsub.publish(POLICY_CHANGED_CHANNEL, sharedChange)

    // The admin-only change was skipped: the first event this viewer gets is the shared one.
    expect(await asUser).toEqual({ done: false, value: sharedChange })

    await events.return?.()
  })
})

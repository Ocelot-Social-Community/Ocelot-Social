import { PubSub } from 'graphql-subscriptions'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PRINCIPAL_CHANGED } from '@constants/subscriptions'
import ocelotLogger from '@src/logger'

import {
  listenForPrincipalChanges,
  principalEpoch,
  publishPrincipalChanged,
} from './principalEpoch'

let pubsub: PubSub
let listener: number

beforeEach(async () => {
  pubsub = new PubSub()
  listener = await listenForPrincipalChanges(pubsub)
})

afterEach(() => {
  pubsub.unsubscribe(listener)
  vi.restoreAllMocks()
})

describe(principalEpoch, () => {
  it('starts at zero for a user nothing has happened to', () => {
    expect(principalEpoch('untouched')).toBe(0)
  })

  it("moves by one per published change, and only that user's", async () => {
    const [mine, theirs] = [principalEpoch('mine'), principalEpoch('theirs')]
    publishPrincipalChanged(pubsub, 'mine')
    publishPrincipalChanged(pubsub, 'mine')
    // In-memory PubSub delivers on the next tick; Redis takes a round trip.
    await vi.waitFor(() => {
      expect(principalEpoch('mine')).toBe(mine + 2)
    })

    expect(principalEpoch('theirs')).toBe(theirs)
  })
})

describe(publishPrincipalChanged, () => {
  it('publishes the user on PRINCIPAL_CHANGED', () => {
    const publish = vi.spyOn(pubsub, 'publish')
    publishPrincipalChanged(pubsub, 'u1')

    expect(publish).toHaveBeenCalledWith(PRINCIPAL_CHANGED, { userId: 'u1' })
  })

  // The mutation has committed by now: a broken broadcast must not fail it, the TTL catches up.
  it('only warns when the publish throws', () => {
    const warn = vi.spyOn(ocelotLogger, 'warn').mockImplementation(() => undefined)
    const error = new Error('broker gone')
    vi.spyOn(pubsub, 'publish').mockImplementation(() => {
      throw error
    })

    expect(() => {
      publishPrincipalChanged(pubsub, 'u1')
    }).not.toThrow()
    expect(warn).toHaveBeenCalledWith(`Could not publish ${PRINCIPAL_CHANGED}`, error)
  })

  it('only warns when the publish rejects', async () => {
    const warn = vi.spyOn(ocelotLogger, 'warn').mockImplementation(() => undefined)
    const error = new Error('broker gone')
    vi.spyOn(pubsub, 'publish').mockRejectedValue(error)
    publishPrincipalChanged(pubsub, 'u1')

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(`Could not publish ${PRINCIPAL_CHANGED}`, error)
    })
  })
})

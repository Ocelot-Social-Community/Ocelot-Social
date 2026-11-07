import { expect, vi } from 'vitest'

import { principalEpoch, publishPrincipalChanged } from '@src/context/principalEpoch'
import { PUBLISH_TIMEOUT_MS } from '@src/context/pubsub'

import type { Context } from '@src/context'

let markers = 0

// vi.waitFor gives up after a second by default, while Redis may take up to PUBLISH_TIMEOUT_MS for
// the publish alone: room for that, and for the way back.
const DELIVERY_TIMEOUT_MS = 2 * PUBLISH_TIMEOUT_MS

// A principal epoch moves when its PRINCIPAL_CHANGED event comes back to the instance: over Redis
// a round trip after the mutation that published it has answered, and possibly after the test that
// ran it is over. A marker published on the same pubsub comes back after everything published
// before it, so once the marker is in, so is all of that: what has not moved by then never will.
// Awaited before an epoch is read, it also keeps a late event of the test before from counting.
export const principalChangesDelivered = async (pubsub: Pick<Context['pubsub'], 'publish'>) => {
  const marker = `delivered-${String(++markers)}`
  publishPrincipalChanged(pubsub, marker)
  await vi.waitFor(
    () => {
      expect(principalEpoch(marker)).toBe(1)
    },
    { timeout: DELIVERY_TIMEOUT_MS },
  )
}

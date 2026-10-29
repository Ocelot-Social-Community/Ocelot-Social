import { PRINCIPAL_CHANGED } from '@constants/subscriptions'
import ocelotLogger from '@src/logger'

import type { Context } from '@context/index'

// A counter per user, raised whenever something a context holds about that user changes in
// the database: their network role, disabled, deleted, an API key revoked. A subscription
// context remembers the count it read its viewer at and reads the viewer again as soon as it
// moved, instead of waiting out SUBSCRIPTION_PRINCIPAL_TTL_MS (see ./subscription.ts).
//
// Every instance keeps its own counters and raises them from PRINCIPAL_CHANGED, which with
// Redis reaches every instance, this one included. Only a movement is ever compared, never a
// value, so the instances need not agree on the numbers. The event is published after the
// change has committed, so whoever reads the viewer because of it reads the new state.
//
// One number per user whose principal ever changed in this process; not worth evicting.
const epochs = new Map<string, number>()
// All of them together: what a context that does not know its viewer yet can compare.
let changes = 0

export const principalEpoch = (userId: string): number => epochs.get(userId) ?? 0

export const principalChanges = (): number => changes

export const listenForPrincipalChanges = async (pubsub: Pick<Context['pubsub'], 'subscribe'>) =>
  pubsub.subscribe(PRINCIPAL_CHANGED, ({ userId }: { userId: string }) => {
    epochs.set(userId, principalEpoch(userId) + 1)
    changes += 1
  })

const warnPublishFailed = (error: unknown) => {
  ocelotLogger.warn(`Could not publish ${PRINCIPAL_CHANGED}`, error)
}

// Fire-and-forget, like publishPermissionsChanged: the mutation has committed, and a lost event
// only means the subscription's TTL catches the change instead.
export const publishPrincipalChanged = (
  pubsub: Pick<Context['pubsub'], 'publish'>,
  userId: string,
): void => {
  try {
    const result = pubsub.publish(PRINCIPAL_CHANGED, { userId })
    void Promise.resolve(result).catch(warnPublishFailed)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error: unknown) {
    warnPublishFailed(error)
  }
}

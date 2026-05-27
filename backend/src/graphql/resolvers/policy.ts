import { POLICY_CHANGED_CHANNEL } from '@src/policy'

import type { Context } from '@src/context'
import type { NetworkPolicy, PolicyKey } from '@src/policy'

const serializeEvent = (event: {
  key: string
  value: unknown
  actor: string
  timestamp: string
}) => ({
  key: event.key,
  value: JSON.stringify(event.value),
  actor: event.actor,
  timestamp: event.timestamp,
})

export default {
  Query: {
    publicPolicy: (_parent: unknown, _args: unknown, { policy }: Context) =>
      policy.getSnapshot('public'),
    adminPolicy: (_parent: unknown, _args: unknown, { policy }: Context) =>
      policy.getSnapshot('admin'),
  },
  Mutation: {
    setPolicy: async (
      _parent: unknown,
      { key, value }: { key: string; value: string },
      { policy, user }: Context,
    ) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        throw new Error('Value must be a JSON-encoded string')
      }
      const event = await policy.set(
        key as PolicyKey,
        parsed as NetworkPolicy[PolicyKey],
        user?.id ?? 'unknown',
      )
      return serializeEvent(event)
    },
    resetPolicy: async (
      _parent: unknown,
      { key }: { key: string },
      { policy, user }: Context,
    ) => {
      const event = await policy.reset(key as PolicyKey, user?.id ?? 'unknown')
      return serializeEvent(event)
    },
  },
  Subscription: {
    policyChanged: {
      subscribe: (_parent: unknown, _args: unknown, { pubsub }: Context) =>
        pubsub.asyncIterator(POLICY_CHANGED_CHANNEL),
      resolve: (payload: { policyChanged: { key: string; value: unknown; actor: string; timestamp: string } }) =>
        serializeEvent(payload.policyChanged),
    },
  },
}

import { withFilter } from 'graphql-subscriptions'

import { POLICY_CHANGED_CHANNEL, canView } from '@src/policy'

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
    // Single resolver: returns the snapshot scoped to the viewer's audiences.
    // Keys the viewer may not see are omitted → null in the (nullable) GraphQL
    // fields. Public keys are always present.
    policy: (_parent: unknown, _args: unknown, { policy, user }: Context) =>
      policy.getVisibleSnapshot(user),
    // Admin-only (see permissionsMiddleware). Routed through the same canView
    // scoping, so an admin sees every key's default.
    policyDefaults: (_parent: unknown, _args: unknown, { policy, user }: Context) =>
      policy.getVisibleDefaults(user),
    // Admin-only (see permissionsMiddleware). Null if nothing has changed yet.
    policyLastChange: (_parent: unknown, _args: unknown, { policy }: Context) =>
      policy.getLastChange(),
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
      // Same visibility mechanism as the query: a change event is only
      // delivered to a subscriber if canView() grants them the changed key.
      // The viewer's context (user) is fixed at WebSocket connect time.
      subscribe: withFilter(
        (_parent: unknown, _args: unknown, { pubsub }: Context) =>
          pubsub.asyncIterator(POLICY_CHANGED_CHANNEL),
        (payload: { policyChanged: { key: string } }, _args: unknown, { user }: Context) =>
          canView(payload.policyChanged.key as PolicyKey, user),
      ),
      resolve: (payload: { policyChanged: { key: string; value: unknown; actor: string; timestamp: string } }) =>
        serializeEvent(payload.policyChanged),
    },
  },
}

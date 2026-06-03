import { withFilter } from 'graphql-subscriptions'

import { POLICY_CHANGED_CHANNEL, canView } from '@src/policy'

import type { Context } from '@src/context'
import type { NetworkPolicy, PolicyKey } from '@src/policy'

// Full event for the admin-only mutations (the admin sees who/when of their own
// change). actor = the acting admin's id; always present here.
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
    // Admin-only (see permissionsMiddleware). One round-trip carrying both
    // admin-only pieces: the configured defaults (canView-scoped, admin sees
    // all) and the most recent change (null until a real change). Replaces the
    // former separate policyLastChange query.
    policyDefaults: (_parent: unknown, _args: unknown, { policy, user }: Context) => ({
      defaults: policy.getVisibleDefaults(user),
      lastChange: policy.getLastChange(),
    }),
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
    resetPolicy: async (_parent: unknown, { key }: { key: string }, { policy, user }: Context) => {
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
      // The broadcast is a lean value-change notification only: key + value, no
      // actor/timestamp. The admin-only last-change audit (who/when) lives solely
      // in the policyDefaults query — so the acting admin's id never travels over
      // the subscription to other subscribers (Datensparsamkeit). The internal
      // Redis payload still carries actor/timestamp (for cross-instance lastChange
      // sync via applyExternalChange); this resolve drops them before the client.
      resolve: (payload: { policyChanged: { key: string; value: unknown } }) => ({
        key: payload.policyChanged.key,
        value: JSON.stringify(payload.policyChanged.value),
      }),
    },
  },
}

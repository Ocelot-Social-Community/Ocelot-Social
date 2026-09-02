import { withFilter } from 'graphql-subscriptions'

import { UserInputError } from '@graphql/errors'
import { isPermissionGatePolicyKey } from '@src/permission/index'
import {
  POLICY_CHANGED_CHANNEL,
  PolicyValidationError,
  canView,
  requiresPolicyFor,
} from '@src/policy/index'

import { publishPermissionsChanged } from './roles'

import type { Context } from '@src/context/index'
import type { NetworkPolicy, PolicyKey, PolicyViewer } from '@src/policy/index'

// The policy viewer is the auth state plus the request's effective permission
// set (resolved from the user's roles in the context). Visibility keys on
// permissions, not on role names — see policy/schema.ts.
const viewerOf = (ctx: Context): PolicyViewer => ({
  authenticated: !!ctx.user,
  permissions: ctx.effectivePermissions,
})

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

// Serialize a viewer-scoped snapshot/defaults record into GraphQL entries. The
// record already carries EVERY key (getVisibleSnapshot/getVisibleDefaults iterate
// allKeys()), so the entry list is complete by construction — the client selects
// `{ key value }` and receives all keys, with no hand-maintained field list to
// drift from the backend key set. A key the viewer may not see (or a genuinely
// unset value) is null; every other value is JSON-encoded, matching the
// setPolicy/policyChanged value convention.
const toEntries = (record: Record<string, unknown>) =>
  Object.entries(record).map(([key, value]) => ({
    key,
    value: value === null || value === undefined ? null : JSON.stringify(value),
    // Static schema metadata (same for every viewer): which policy keys gate this one, so
    // the client can re-fold the effective value (a layout toggle that respects its feature
    // gate). Empty for most keys.
    requiresPolicy: requiresPolicyFor(key as PolicyKey),
  }))

export default {
  Query: {
    // Single resolver: returns the snapshot scoped to the viewer's audiences as a
    // key/value list. Keys the viewer may not see carry a null value. Public keys
    // are always present.
    policy: (_parent: unknown, _args: unknown, ctx: Context) =>
      toEntries(ctx.policy.getVisibleSnapshot(viewerOf(ctx))),
    // Admin-only (see permissionsMiddleware). One round-trip carrying both
    // admin-only pieces: the configured defaults (canView-scoped, admin sees
    // all) and the most recent change (null until a real change). Replaces the
    // former separate policyLastChange query.
    policyDefaults: (_parent: unknown, _args: unknown, ctx: Context) => ({
      defaults: toEntries(ctx.policy.getVisibleDefaults(viewerOf(ctx))),
      lastChange: ctx.policy.getLastChange(),
    }),
  },
  Mutation: {
    setPolicy: async (
      _parent: unknown,
      { key, value }: { key: string; value: string },
      context: Context,
    ) => {
      const { policy, user } = context
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        throw new UserInputError('Value must be a JSON-encoded string')
      }
      try {
        const event = await policy.set(
          key as PolicyKey,
          parsed as NetworkPolicy[PolicyKey],
          user?.id ?? 'unknown',
        )
        // A gate-flag change flips permission availability network-wide, so signal the
        // permission system too: clients refetch myPermissions (can()) and the admin
        // roles catalog (available) live, not just the policy value.
        if (isPermissionGatePolicyKey(key)) {
          publishPermissionsChanged(context, null)
        }
        return serializeEvent(event)
      } catch (err) {
        // A domain validation error (e.g. a valid-JSON value of the wrong type,
        // "123" for a boolean key) is a client input error, not an internal one.
        if (err instanceof PolicyValidationError) {
          throw new UserInputError(err.message)
        }
        throw err
      }
    },
    resetPolicy: async (_parent: unknown, { key }: { key: string }, context: Context) => {
      const { policy, user } = context
      try {
        const event = await policy.reset(key as PolicyKey, user?.id ?? 'unknown')
        if (isPermissionGatePolicyKey(key)) {
          publishPermissionsChanged(context, null)
        }
        return serializeEvent(event)
      } catch (err) {
        if (err instanceof PolicyValidationError) {
          throw new UserInputError(err.message)
        }
        throw err
      }
    },
    // Bulk reset (the admin "reset all" button): one round-trip instead of N, resetting only
    // the keys that actually diverge from their default.
    resetPolicies: async (_parent: unknown, { keys }: { keys: string[] }, context: Context) => {
      const { policy, user } = context
      try {
        const events = await policy.resetMany(keys as PolicyKey[], user?.id ?? 'unknown')
        // One permissionsChanged signal if a reset key that actually changed gates a
        // permission — clients refetch myPermissions + the admin roles catalog once, not
        // once per key.
        if (events.some((event) => isPermissionGatePolicyKey(event.key))) {
          publishPermissionsChanged(context, null)
        }
        return events.map(serializeEvent)
      } catch (err) {
        if (err instanceof PolicyValidationError) {
          throw new UserInputError(err.message)
        }
        throw err
      }
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
        (payload: { policyChanged: { key: string } }, _args: unknown, ctx: Context) =>
          canView(payload.policyChanged.key as PolicyKey, viewerOf(ctx)),
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

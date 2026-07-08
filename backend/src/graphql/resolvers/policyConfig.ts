import { categoryRank } from '@src/config/categories'
import {
  allKeys,
  categoryFor,
  envSeedFor,
  policyValueLayers,
  requiresPolicyFor,
  typeFor,
} from '@src/policy'

import type { Context } from '@src/context'

// Admin-only (see permissionsMiddleware). One row per policy key exposing its three
// value layers (software default / configured env-seed default / effective) plus its
// hard env requirements — the single source feeding both the policy and config tabs.
// Values are JSON-encoded (heterogeneous types); env vars are reported by presence
// state only, never by value. Rows are returned in the global category display order
// (categoryRank, from ENV_CATEGORIES) so the admin policy tab renders its groups
// straight from row order — no client-side category order list.
export default {
  Query: {
    policyConfig: (_parent: unknown, _args: unknown, context: Context) => {
      const { policy } = context
      // Match systemConfig: no policy service on the context (context.policy is optional —
      // e.g. an uninitialised request path) → empty list rather than crashing on
      // policyValueLayers / policy.envState / requiresEnvStatus / isAvailable below.
      if (!policy) return []
      return allKeys()
        .map((key) => {
          const envSeed = envSeedFor(key) ?? null
          // policy→policy dependencies with their current effective (satisfied) state.
          const requiresPolicy = requiresPolicyFor(key).map((dependency) => ({
            key: dependency,
            satisfied: policy.getEffective(dependency) === true,
          }))
          return {
            key,
            type: typeFor(key),
            category: categoryFor(key),
            ...policyValueLayers(policy, key),
            envSeed,
            envSeedState: envSeed ? policy.envState(envSeed) : null,
            requiresEnv: policy.requiresEnvStatus(key),
            requiresPolicy,
            // A key can take effect only when its hard env requirements AND its policy
            // dependencies are all met — so the admin tab greys the group header toggle
            // while the groups feature is off, mirroring the env-unavailable behaviour.
            available: policy.isAvailable(key) && requiresPolicy.every((d) => d.satisfied),
          }
        })
        .sort((a, b) => categoryRank(a.category) - categoryRank(b.category))
    },
  },
}

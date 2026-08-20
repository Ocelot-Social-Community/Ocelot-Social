import { categoryRank } from '@src/config/categories'
import { allKeys, categoryFor, envSeedFor, policyValueLayers, typeFor } from '@src/policy'

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
      if (!policy) {
        return []
      }
      return allKeys()
        .map((key) => {
          const envSeed = envSeedFor(key) ?? null
          return {
            key,
            type: typeFor(key),
            category: categoryFor(key),
            ...policyValueLayers(policy, key),
            envSeed,
            envSeedState: envSeed ? policy.envState(envSeed) : null,
            requiresEnv: policy.requiresEnvStatus(key),
            // Env availability only; policy→policy dependencies (requiresPolicy on the policy
            // query) are folded live in the admin tab so re-enabling a dependency un-greys the
            // dependent key without refetching this metadata.
            available: policy.isAvailable(key),
          }
        })
        .sort((a, b) => categoryRank(a.category) - categoryRank(b.category))
    },
  },
}

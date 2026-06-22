import { allKeys, defaultFor, envSeedFor, typeFor } from '@src/policy'

import type { Context } from '@src/context'

// Admin-only (see permissionsMiddleware). One row per policy key exposing its three
// value layers (software default / configured env-seed default / effective) plus its
// hard env requirements — the single source feeding both the policy and config tabs.
// Values are JSON-encoded (heterogeneous types); env vars are reported by presence
// state only, never by value.
export default {
  Query: {
    policyConfig: (_parent: unknown, _args: unknown, context: Context) => {
      const { policy } = context
      return allKeys().map((key) => {
        const envSeed = envSeedFor(key) ?? null
        return {
          key,
          type: typeFor(key),
          effective: JSON.stringify(policy.getEffective(key)),
          softwareDefault: JSON.stringify(defaultFor(key)),
          configuredDefault: JSON.stringify(policy.getDefault(key)),
          envSeed,
          envSeedState: envSeed ? policy.envState(envSeed) : null,
          requiresEnv: policy.requiresEnvStatus(key),
          available: policy.isAvailable(key),
        }
      })
    },
  },
}

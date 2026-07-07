import { defaultFor } from './schema'

import type { PolicyKey } from './types'

// The three JSON-encoded value layers of a policy key, in precedence order from most to
// least specific:
//   • effective       — the value actually in operation (env-seeded default, admin
//                        override, and env availability already folded in)
//   • configuredDefault — the configured default the effective value falls back to
//                        (the env-seeded default materialised in storage)
//   • softwareDefault  — the code baseline from the policy schema
// Values are heterogeneous (boolean / integer), so each layer is JSON-encoded to a string.
export interface PolicyValueLayers {
  effective: string
  softwareDefault: string
  configuredDefault: string
}

// The single place that defines the JSON-encoded layer semantics. Both the policyConfig
// resolver (admin policy tab) and systemConfigStatus (admin config tab) build their rows
// on this, so the two views can never diverge on how a layer is derived or encoded. Kept
// structural (getEffective/getDefault) so a real PolicyService or an in-memory test double
// both pass straight through.
export function policyValueLayers(
  policy: {
    getEffective: (key: PolicyKey) => unknown
    getDefault: (key: PolicyKey) => unknown
  },
  key: PolicyKey,
): PolicyValueLayers {
  return {
    effective: JSON.stringify(policy.getEffective(key)),
    softwareDefault: JSON.stringify(defaultFor(key)),
    configuredDefault: JSON.stringify(policy.getDefault(key)),
  }
}

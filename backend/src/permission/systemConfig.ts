// Read-only configuration status for the admin "system config" view. It reports, per
// permission feature gate, whether the gate is open and *why* — without ever leaking a
// secret value. Two gate sources mirror gates.ts:
//   • env  → fixed at deploy time, needs a redeploy + restart to change (e.g. videoCall
//            / LiveKit needs URL + key + secret). The underlying env keys are reported
//            with a presence state only (secrets are never returned in cleartext).
//   • policy → an env-seeded default that is changeable at runtime via the policy tab
//            (e.g. apiKeys → apiKeysEnabled). We point at the policy key so the UI can
//            deep-link there instead of showing env keys.
import { isGateOpen } from './gates'

import type { PermissionGate } from './types'

const API_KEYS_POLICY_KEY = 'apiKeysEnabled' as const

// presence only — never the value of a secret
export type ConfigKeyState = 'set' | 'empty' | 'missing'
export type FeatureGateSource = 'env' | 'policy'

export interface ConfigKeyStatus {
  key: string
  secret: boolean
  state: ConfigKeyState
  // Cleartext value for non-secret keys (e.g. the LiveKit URL, useful for spotting a
  // wrong protocol/host); always null for secrets and for unset keys.
  value: string | null
}

export interface FeatureGateStatus {
  gate: PermissionGate
  open: boolean
  source: FeatureGateSource
  // For policy-backed gates: the policy key (deep-link target). Null for env gates.
  policyKey: string | null
  // For env-backed gates: the underlying env keys with their presence state. Empty for
  // policy gates (their truth lives in the policy tab).
  keys: ConfigKeyStatus[]
}

// Structural view of the request context this needs — a superset of gates.ts'
// GateContext (adds the raw LiveKit strings for per-key status). The full Context
// satisfies it, so resolvers pass `ctx` directly.
export interface SystemConfigContext {
  config: {
    LIVEKIT_ENABLED: boolean
    LIVEKIT_URL?: string
    LIVEKIT_API_KEY?: string
    LIVEKIT_API_SECRET?: string
  }
  policy?: { get: (key: typeof API_KEYS_POLICY_KEY) => boolean }
}

const stateOf = (value: string | undefined): ConfigKeyState =>
  value === undefined ? 'missing' : value === '' ? 'empty' : 'set'

const keyStatus = (key: string, value: string | undefined, secret: boolean): ConfigKeyStatus => ({
  key,
  secret,
  state: stateOf(value),
  value: secret ? null : (value ?? null),
})

// The configuration status of every feature gate, in a stable order.
export function systemConfigStatus(ctx: SystemConfigContext): FeatureGateStatus[] {
  const { config } = ctx
  return [
    {
      gate: 'videoCall',
      open: config.LIVEKIT_ENABLED,
      source: 'env',
      policyKey: null,
      keys: [
        keyStatus('LIVEKIT_URL', config.LIVEKIT_URL, false),
        keyStatus('LIVEKIT_API_KEY', config.LIVEKIT_API_KEY, true),
        keyStatus('LIVEKIT_API_SECRET', config.LIVEKIT_API_SECRET, true),
      ],
    },
    {
      gate: 'apiKeys',
      open: isGateOpen('apiKeys', ctx),
      source: 'policy',
      policyKey: API_KEYS_POLICY_KEY,
      keys: [],
    },
  ]
}

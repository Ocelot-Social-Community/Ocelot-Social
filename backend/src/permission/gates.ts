// Runtime feature gates for permissions. A permission may declare `gatedBy` in the
// catalog; while its gate is closed the right exists (and can be bundled into roles)
// but is NOT effective — it is dropped from authorization checks and reported as
// unavailable to the admin UI. This is the single coupling point between a permission
// and an env/policy feature flag.
//
// Why two sources:
//   • 'videoCall' → config.LIVEKIT_ENABLED. Video conferencing needs LiveKit secrets
//     (URL/key/secret) to work at all, so its availability is derived from CONFIG and
//     is deliberately NOT an independent runtime toggle (a policy toggle that could be
//     ON without secrets would be a footgun).
//   • 'apiKeys' → the apiKeysEnabled POLICY flag (a pure runtime toggle, no external
//     secret needed), so admins can enable/disable it live.
import { gateFor } from './schema'

import type { PermissionGate, PermissionKey } from './types'

// Minimal structural view of the request context a gate needs. Kept local (not the
// full Context) so this module stays dependency-light and trivially unit-testable.
export interface GateContext {
  config: { LIVEKIT_ENABLED: boolean }
  policy?: { get: (key: 'apiKeysEnabled') => boolean }
}

// Whether a named gate is currently open (its feature configured/enabled).
export function isGateOpen(gate: PermissionGate, ctx: GateContext): boolean {
  switch (gate) {
    case 'videoCall':
      return ctx.config.LIVEKIT_ENABLED
    case 'apiKeys':
      return ctx.policy?.get('apiKeysEnabled') ?? false
  }
}

// Whether a permission is effective right now: ungated permissions always are; a
// gated one only while its gate is open.
export function isPermissionAvailable(key: PermissionKey, ctx: GateContext): boolean {
  const gate = gateFor(key)
  return gate === undefined || isGateOpen(gate, ctx)
}

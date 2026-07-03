// Builds the admin "environment configuration" view: one row per environment
// variable the deployment recognises, merging the static registry (secret flag,
// category, software default — see envRegistry.ts) with the dynamic policy overlay
// (effective value, admin override, presence state — from the PolicyService).
//
// Two invariants:
//   • Secret hygiene — a secret's value is NEVER returned (value columns are null);
//     only its presence state (set / empty / missing) is reported. A var absent from
//     the registry is treated as a secret, so omission can't leak a value.
//   • No duplicate rows — a var is emitted once: as a policy SEED row (overridable,
//     deep-links to the policy tab), a policy REQUIRED row (a hard-requirement env
//     var, e.g. a LiveKit key), or a plain infrastructure row.

/* eslint-disable security/detect-object-injection */ // keys come from the fixed policy schema / env registry, never user input
import { allKeys, defaultFor, envSeedFor, requiresEnvFor } from '@src/policy'

import { ENV_REGISTRY, ENV_SPEC_BY_NAME, POLICY_CATEGORY } from './envRegistry'

import type { EnvCategory, EnvVarSpec } from './envRegistry'
import type { PolicyKey } from '@src/policy'

export type ConfigKeyState = 'set' | 'empty' | 'missing'

export interface SystemConfigRow {
  // The environment variable name.
  envKey: string
  // Display grouping (see EnvCategory).
  category: EnvCategory
  // Secret vars report presence only; their value/default columns are null.
  secret: boolean
  // Presence of the env var.
  state: ConfigKeyState
  // The effective (in-operation) value as a display string: JSON-encoded for policy
  // values, a raw string for plain env vars. null ⇒ show the presence badge instead
  // (secrets and hard-requirement rows). Consumers pretty-print via a JSON-tolerant fmt.
  effective: string | null
  // The admin override value when it diverges from the configured default (policy
  // rows only), else null. Its presence drives the "override set" vs "set override" UI.
  override: string | null
  // The value the env var itself provides when set (JSON-encoded for seed vars, raw
  // otherwise). null for secrets, unset vars, and hard-requirement rows.
  envValue: string | null
  // The software default the value falls back to, or null (none / secret).
  softwareDefault: string | null
  // Whether an admin can override this via a policy — drives the deep-link.
  overridable: boolean
  // The policy key to deep-link to on the policy tab (set for policy rows), else null.
  policyKey: string | null
  // An unmet hard env requirement that breaks its feature regardless of the policy flag.
  blocking: boolean
}

// Minimal env shape — a subset of process.env, injected so this stays testable
// without mutating the global environment (mirrors PolicyService's design).
export type Env = Record<string, string | undefined>

// The slice of the PolicyService this needs. Kept structural so tests can pass a real
// in-memory PolicyService (createInMemoryPolicyService) straight through.
export interface PolicyLike {
  getEffective: (key: PolicyKey) => unknown
  getDefault: (key: PolicyKey) => unknown
  envState: (name: string) => ConfigKeyState
}

// A var missing from the registry is treated as a secret (never leak its value) and
// bucketed under 'general'.
const specFor = (name: string): EnvVarSpec =>
  ENV_SPEC_BY_NAME[name] ?? { name, secret: true, category: 'general', softwareDefault: null }

// Category for a policy key's env rows, defaulting to 'features'.
const categoryOf = (key: PolicyKey): EnvCategory => POLICY_CATEGORY[key] ?? 'features'

// One row per recognised env var, merging static registry metadata with the live
// policy overlay. Order: policy rows in schema order (seed or hard-requirement),
// then the remaining plain infrastructure rows in registry order. The client groups
// by category for display, so only intra-category order matters here.
export function systemConfigStatus(env: Env, policy: PolicyLike): SystemConfigRow[] {
  const rows: SystemConfigRow[] = []
  // Names owned by a policy (seed or hard requirement) — excluded from the plain pass
  // so no var is emitted twice.
  const governed = new Set<string>()

  for (const key of allKeys()) {
    const category = categoryOf(key)
    const seed = envSeedFor(key)

    if (seed) {
      governed.add(seed)
      const seedState = policy.envState(seed)
      const effective = JSON.stringify(policy.getEffective(key))
      const configuredDefault = JSON.stringify(policy.getDefault(key))
      // A seeded key has no hard requirement, so effective == configuredDefault unless
      // an admin overrode it in the DB — that divergence IS the override, exactly.
      const overridden = effective !== configuredDefault
      rows.push({
        envKey: seed,
        category,
        secret: false,
        state: seedState,
        effective,
        override: overridden ? effective : null,
        // The env only contributes a value when actually set; otherwise the configured
        // default equals the software default and this column is em-dashed.
        envValue: seedState === 'set' ? configuredDefault : null,
        softwareDefault: JSON.stringify(defaultFor(key)),
        overridable: true,
        policyKey: key,
        blocking: false,
      })
    }

    for (const name of requiresEnvFor(key)) {
      governed.add(name)
      const spec = specFor(name)
      const state = policy.envState(name)
      rows.push({
        envKey: name,
        category,
        secret: spec.secret,
        state,
        // A hard-requirement var gates availability; its effective cell shows presence,
        // not a value. A non-secret one (e.g. the LiveKit URL) still exposes its value
        // in the env-value column for diagnosing a wrong host/protocol.
        effective: null,
        override: null,
        envValue: !spec.secret && state === 'set' ? (env[name] ?? null) : null,
        softwareDefault: null,
        overridable: false,
        policyKey: key,
        // Unmet requirement → the feature is broken regardless of its policy flag.
        blocking: state !== 'set',
      })
    }
  }

  for (const spec of ENV_REGISTRY) {
    if (governed.has(spec.name)) continue
    const state = policy.envState(spec.name)
    const value = !spec.secret && state === 'set' ? (env[spec.name] ?? null) : null
    rows.push({
      envKey: spec.name,
      category: spec.category,
      secret: spec.secret,
      state,
      // Non-secret: show the value in effect (env value, else the software default it
      // falls back to). Secret: null → presence badge only.
      effective: spec.secret ? null : (value ?? spec.softwareDefault),
      override: null,
      envValue: value,
      softwareDefault: spec.secret ? null : spec.softwareDefault,
      overridable: false,
      policyKey: null,
      blocking: false,
    })
  }

  return rows
}

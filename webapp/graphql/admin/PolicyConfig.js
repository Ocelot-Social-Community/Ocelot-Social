import gql from 'graphql-tag'

// Admin-only (policy.manage). Per-policy configuration with its value layers
// (software default / env-seed default / effective) and hard env requirements.
// Secret values are never returned — env vars are reported by presence state only —
// so this is safe to surface for diagnosing deployment misconfiguration.
export const policyConfigQuery = gql`
  query {
    policyConfig {
      key
      type
      effective
      softwareDefault
      configuredDefault
      envSeed
      envSeedState
      requiresEnv {
        name
        state
      }
      available
    }
  }
`

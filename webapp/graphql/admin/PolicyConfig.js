import gql from 'graphql-tag'

// Admin-only (policy.manage). Just the per-key metadata the policy tab renders from: the
// display category and value type (drive the grouping + number-vs-checkbox), whether the
// key's hard requirements are met (an unavailable key is greyed/disabled), and — for a key
// made unavailable by a policy→policy dependency (e.g. showGroupButtonInHeader ← groupsEnabled)
// — which dependencies are unsatisfied, so the row links to the depended-on policy instead of
// the env config tab. The full value layers live on the config tab (systemConfig), not here.
export const policyConfigQuery = gql`
  query {
    policyConfig {
      key
      category
      type
      available
      requiresPolicy {
        key
        satisfied
      }
    }
  }
`

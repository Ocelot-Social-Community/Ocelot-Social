import gql from 'graphql-tag'

// Admin-only (policy.manage). Just the per-key metadata the policy tab renders from: the
// display category and value type (drive the grouping + number-vs-checkbox), and whether the
// key's hard env requirements are met (an unavailable key is greyed/disabled and links to the
// config tab). The full value layers live on the config tab (systemConfig), not here.
export const policyConfigQuery = gql`
  query {
    policyConfig {
      key
      category
      type
      available
    }
  }
`

import gql from 'graphql-tag'

// Admin-only (policy.manage). Just the per-key metadata the policy tab renders from: the
// display category and value type (drive the grouping + number-vs-checkbox), and whether the
// key's hard ENV requirements are met (an env-unavailable key is greyed/disabled and links to
// the config tab). Policy→policy dependencies are folded live in the tab from the policy
// store's dep map (so they react to a toggle without refetching). The full value layers live
// on the config tab (systemConfig), not here.
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

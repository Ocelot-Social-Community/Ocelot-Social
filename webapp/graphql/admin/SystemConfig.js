import gql from 'graphql-tag'

// Admin-only (policy.manage) feature-gate configuration status. Secret values are
// never returned by the backend — only their presence `state` — so this is safe to
// surface in the UI for diagnosing deployment misconfiguration.
export const systemConfigQuery = gql`
  query {
    systemConfig {
      gate
      open
      source
      policyKey
      keys {
        key
        secret
        state
        value
      }
    }
  }
`

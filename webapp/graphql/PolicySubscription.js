import gql from 'graphql-tag'

// Lean value-change notification: key + value only. The last-change audit
// (who/when) is admin-only and lives in the policyDefaults query, so it never
// rides along on the broadcast.
export default () => gql`
  subscription policyChanged {
    policyChanged {
      key
      value
    }
  }
`

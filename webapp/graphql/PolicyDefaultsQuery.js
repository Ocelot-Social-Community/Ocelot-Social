import gql from 'graphql-tag'

// Admin-only bundle: the configured defaults (ENV seed or schema default) each
// policy key resets to, plus the most recent change (who + when). One admin
// round-trip — replaces the former separate policyLastChange query. Defaults come
// back as a key/value list (value JSON-encoded), covering every key automatically
// — no per-key field selection to keep in sync with the backend.
export default () => gql`
  query policyDefaults {
    policyDefaults {
      defaults {
        key
        value
      }
      lastChange {
        actor
        timestamp
      }
    }
  }
`

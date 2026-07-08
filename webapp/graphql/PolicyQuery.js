import gql from 'graphql-tag'

// Single policy query, reused for every fetch (SSR init, after login, after
// logout). The backend returns EVERY recognised policy key as a key/value entry
// (value JSON-encoded), so there is no hand-maintained field list to drift from
// the backend key set. Values are scoped to the current viewer: a key the viewer
// may not see (e.g. apiKeysEnabled when logged out) comes back with a null value.
export default () => gql`
  query policy {
    policy {
      key
      value
      requiresPolicy
    }
  }
`

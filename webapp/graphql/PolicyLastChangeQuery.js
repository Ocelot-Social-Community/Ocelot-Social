import gql from 'graphql-tag'

// Admin-only: who last changed any policy key, and when (null if never changed).
export default () => gql`
  query policyLastChange {
    policyLastChange {
      actor
      timestamp
    }
  }
`

import gql from 'graphql-tag'

// Admin-only bundle: the configured defaults (ENV seed or schema default) each
// policy key resets to, plus the most recent change (who + when). One admin
// round-trip — replaces the former separate policyLastChange query.
export default () => gql`
  query policyDefaults {
    policyDefaults {
      defaults {
        publicRegistration
        inviteRegistration
        askForRealName
        requireLocation
        categoriesActive
        badgesEnabled
        apiKeysEnabled
        apiKeysMaxPerUser
        maxGroupPinnedPosts
      }
      lastChange {
        actor
        timestamp
      }
    }
  }
`

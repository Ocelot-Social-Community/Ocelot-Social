import gql from 'graphql-tag'

// Admin-only: the configured defaults (ENV seed or schema default) each policy
// key resets to. Shown in the admin UI; the frontend keeps no defaults of its own.
export default () => gql`
  query policyDefaults {
    policyDefaults {
      publicRegistration
      inviteRegistration
      categoriesActive
      apiKeysEnabled
    }
  }
`

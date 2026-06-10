import gql from 'graphql-tag'

// Single policy query, reused for every fetch (SSR init, after login, after
// logout). The backend returns values scoped to the current viewer: keys the
// viewer may not see (e.g. apiKeysEnabled when logged out) come back as null.
export default () => gql`
  query policy {
    policy {
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
  }
`

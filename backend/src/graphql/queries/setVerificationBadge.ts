import gql from 'graphql-tag'

export const setVerificationBadge = gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    setVerificationBadge(badgeId: $badgeId, userId: $userId) {
      id
      badgeVerification {
        id
        isDefault
      }
      badgeTrophies {
        id
      }
    }
  }
`

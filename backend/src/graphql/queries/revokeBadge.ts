import gql from 'graphql-tag'

export const revokeBadge = gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    revokeBadge(badgeId: $badgeId, userId: $userId) {
      id
      badgeTrophies {
        id
      }
      badgeVerification {
        id
        isDefault
      }
      badgeTrophiesSelected {
        id
        isDefault
      }
    }
  }
`

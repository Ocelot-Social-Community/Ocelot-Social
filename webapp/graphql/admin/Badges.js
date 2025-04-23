import gql from 'graphql-tag'

export const queryBadges = () => gql`
  query {
    Badge {
      id
      type
      icon
      description
    }
  }
`

export const setVerificationBadge = () => gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    setVerificationBadge(badgeId: $badgeId, userId: $userId) {
      id
      badgeVerification {
        id
      }
      badgeTrophies {
        id
      }
    }
  }
`

export const rewardTrophyBadge = () => gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    rewardTrophyBadge(badgeId: $badgeId, userId: $userId) {
      id
      badgeVerification {
        id
      }
      badgeTrophies {
        id
      }
    }
  }
`

export const revokeBadge = () => gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    revokeBadge(badgeId: $badgeId, userId: $userId) {
      id
      badgeVerification {
        id
      }
      badgeTrophies {
        id
      }
    }
  }
`

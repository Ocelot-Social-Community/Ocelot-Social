import gql from 'graphql-tag'

export const queryBadges = () => gql`
  query {
    Badge {
      id
      type
      icon
    }
  }
`

export const setVerificationBadge = () => gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    verify(badgeId: $badgeId, userId: $userId) {
      id
      verified {
        id
      }
      badges {
        id
      }
    }
  }
`

export const rewardTrophyBadge = () => gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    reward(badgeId: $badgeId, userId: $userId) {
      id
      verified {
        id
      }
      badges {
        id
      }
    }
  }
`

export const revokeBadge = () => gql`
  mutation ($badgeId: ID!, $userId: ID!) {
    unreward(badgeId: $badgeId, userId: $userId) {
      id
      verified {
        id
      }
      badges {
        id
      }
    }
  }
`

import gql from 'graphql-tag'

export const rewardTrophyBadge = gql`
  mutation rewardTrophyBadge($badgeId: ID!, $userId: ID!) {
    rewardTrophyBadge(badgeId: $badgeId, userId: $userId) {
      id
      badgeVerification {
        id
        isDefault
      }
      badgeTrophiesCount
      badgeTrophies {
        id
      }
      badgeTrophiesSelected {
        id
      }
    }
  }
`

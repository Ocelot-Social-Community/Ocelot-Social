import gql from 'graphql-tag'

export const setTrophyBadgeSelected = gql`
  mutation setTrophyBadgeSelected($slot: Int!, $badgeId: ID) {
    setTrophyBadgeSelected(slot: $slot, badgeId: $badgeId) {
      badgeTrophiesCount
      badgeTrophiesSelected {
        id
        isDefault
      }
      badgeTrophiesUnused {
        id
      }
      badgeTrophiesUnusedCount
    }
  }
`

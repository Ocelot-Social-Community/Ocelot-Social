import gql from 'graphql-tag'

export const resetTrophyBadgesSelected = gql`
  mutation {
    resetTrophyBadgesSelected {
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

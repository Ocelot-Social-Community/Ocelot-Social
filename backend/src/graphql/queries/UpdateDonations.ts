import gql from 'graphql-tag'

export const UpdateDonations = gql`
  mutation ($showDonations: Boolean, $goal: Int, $progress: Int) {
    UpdateDonations(showDonations: $showDonations, goal: $goal, progress: $progress) {
      id
      showDonations
      goal
      progress
      createdAt
      updatedAt
    }
  }
`

import gql from 'graphql-tag'

export const Donations = gql`
  query {
    Donations {
      id
      showDonations
      goal
      progress
    }
  }
`

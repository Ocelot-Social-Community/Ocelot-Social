import gql from 'graphql-tag'

export const badges = gql`
  fragment badges on User {
    badgeTrophiesSelected {
      id
      icon
      description
    }
    badgeVerification {
      id
      icon
      description
    }
  }
`

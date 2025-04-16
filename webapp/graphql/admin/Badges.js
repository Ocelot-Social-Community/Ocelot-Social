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

export const verify = () => gql`
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

export const reward = () => gql`
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

export const unreward = () => gql`
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

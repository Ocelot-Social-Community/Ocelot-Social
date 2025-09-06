import gql from 'graphql-tag'

export const review = gql`
  mutation ($resourceId: ID!, $disable: Boolean, $closed: Boolean) {
    review(resourceId: $resourceId, disable: $disable, closed: $closed) {
      createdAt
      updatedAt
      resource {
        __typename
        ... on User {
          id
          disabled
        }
        ... on Post {
          id
          disabled
        }
        ... on Comment {
          id
          disabled
        }
      }
      report {
        id
        createdAt
        updatedAt
        closed
        reviewed {
          createdAt
          moderator {
            id
          }
        }
      }
    }
  }
`

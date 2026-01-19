import gql from 'graphql-tag'

export const reports = gql`
  query ($closed: Boolean) {
    reports(orderBy: createdAt_desc, closed: $closed) {
      id
      createdAt
      updatedAt
      rule
      disable
      closed
      resource {
        __typename
        ... on User {
          id
        }
        ... on Post {
          id
        }
        ... on Comment {
          id
        }
      }
      filed {
        submitter {
          id
        }
        createdAt
        reasonCategory
        reasonDescription
      }
    }
  }
`

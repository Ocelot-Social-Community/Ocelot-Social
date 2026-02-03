import gql from 'graphql-tag'

export const reports = gql`
  query ($orderBy: ReportOrdering, $reviewed: Boolean, $closed: Boolean) {
    reports(orderBy: $orderBy, reviewed: $reviewed, closed: $closed) {
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

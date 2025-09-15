import gql from 'graphql-tag'

export const fileReport = gql`
  mutation ($resourceId: ID!, $reasonCategory: ReasonCategory!, $reasonDescription: String!) {
    fileReport(
      resourceId: $resourceId
      reasonCategory: $reasonCategory
      reasonDescription: $reasonDescription
    ) {
      createdAt
      reasonCategory
      reasonDescription
      reportId
      resource {
        __typename
        ... on User {
          name
        }
        ... on Post {
          title
        }
        ... on Comment {
          content
        }
      }
    }
  }
`

import gql from 'graphql-tag'

export const markAllAsRead = gql`
  mutation {
    markAllAsRead {
      id
      from {
        __typename
        ... on Post {
          content
        }
        ... on Comment {
          content
        }
      }
      read
      createdAt
    }
  }
`

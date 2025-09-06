import gql from 'graphql-tag'

export const markAsRead = gql`
  mutation ($id: ID!) {
    markAsRead(id: $id) {
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

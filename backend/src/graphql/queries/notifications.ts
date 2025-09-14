import gql from 'graphql-tag'

export const notifications = gql`
  query ($read: Boolean, $orderBy: NotificationOrdering) {
    notifications(read: $read, orderBy: $orderBy) {
      reason
      relatedUser {
        id
      }
      from {
        __typename
        ... on Post {
          id
          content
        }
        ... on Comment {
          id
          content
        }
        ... on Group {
          id
        }
      }
      read
      createdAt
    }
  }
`

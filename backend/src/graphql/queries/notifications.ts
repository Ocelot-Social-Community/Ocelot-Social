import gql from 'graphql-tag'

export const notifications = gql`
  query ($read: Boolean, $orderBy: NotificationOrdering) {
    notifications(read: $read, orderBy: $orderBy) {
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

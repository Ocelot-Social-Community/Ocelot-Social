import gql from 'graphql-tag'

export const notificationQuery = () => {
  return gql`
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
}

import gql from 'graphql-tag'

// ------ mutations

export const markAsReadMutation = () => {
  return gql`
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
}

export const markAllAsReadMutation = () => {
  return gql`
    mutation {
      markAllAsRead {
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

// ------ queries

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

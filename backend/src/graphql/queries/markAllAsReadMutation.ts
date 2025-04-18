import gql from 'graphql-tag'

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

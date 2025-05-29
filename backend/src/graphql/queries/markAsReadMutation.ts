import gql from 'graphql-tag'

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

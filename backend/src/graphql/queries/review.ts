import gql from 'graphql-tag'

export const review = gql`
  mutation ($resourceId: ID!, $disable: Boolean, $closed: Boolean) {
    review(resourceId: $resourceId, disable: $disable, closed: $closed) {
      createdAt
      updatedAt
    }
  }
`

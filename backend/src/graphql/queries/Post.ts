import gql from 'graphql-tag'

export const Post = gql`
  query ($orderBy: [_PostOrdering]) {
    Post(orderBy: $orderBy) {
      id
      pinned
      createdAt
      pinnedAt
    }
  }
`

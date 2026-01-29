import gql from 'graphql-tag'

export const pinGroupPost = gql`
  mutation ($id: ID!) {
    pinGroupPost(id: $id) {
      id
      title
      content
      author {
        name
        slug
      }
      pinnedBy {
        id
        name
        role
      }
      createdAt
      updatedAt
      pinnedAt
      pinned
      groupPinned
    }
  }
`

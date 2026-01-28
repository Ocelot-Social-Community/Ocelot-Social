import gql from 'graphql-tag'

export const unpinGroupPost = gql`
  mutation ($id: ID!) {
    unpinGroupPost(id: $id) {
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
      pinned
      pinnedAt
      groupPinned
    }
  }
`

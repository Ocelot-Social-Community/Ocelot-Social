import gql from 'graphql-tag'

export const unpinPost = gql`
  mutation ($id: ID!) {
    unpinPost(id: $id) {
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
    }
  }
`

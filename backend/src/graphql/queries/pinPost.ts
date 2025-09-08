import gql from 'graphql-tag'

export const pinPost = gql`
  mutation ($id: ID!) {
    pinPost(id: $id) {
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
    }
  }
`

import gql from 'graphql-tag'

export const userData = gql`
  query ($id: ID!) {
    userData(id: $id) {
      user {
        id
        name
        slug
      }
      posts {
        id
        title
        content
        comments {
          content
          author {
            slug
          }
        }
      }
    }
  }
`

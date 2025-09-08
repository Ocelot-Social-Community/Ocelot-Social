import gql from 'graphql-tag'

export const searchResults = gql`
  query ($query: String!) {
    searchResults(query: $query, limit: 5) {
      __typename
      ... on Post {
        id
        title
        content
      }
      ... on User {
        id
        slug
        name
      }
      ... on Tag {
        id
      }
    }
  }
`

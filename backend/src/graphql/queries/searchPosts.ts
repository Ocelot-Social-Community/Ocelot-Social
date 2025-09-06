import gql from 'graphql-tag'

export const searchPosts = gql`
  query ($query: String!, $firstPosts: Int, $postsOffset: Int) {
    searchPosts(query: $query, firstPosts: $firstPosts, postsOffset: $postsOffset) {
      postCount
      posts {
        id
        title
        content
      }
    }
  }
`

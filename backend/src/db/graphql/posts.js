import gql from 'graphql-tag'

// ------ mutations

export const createPostMutation = gql`
  mutation ($title: String!, $content: String!, $categoryIds: [ID]!, $slug: String) {
    CreatePost(title: $title, content: $content, categoryIds: $categoryIds, slug: $slug) {
      slug
    }
  }
`

// ------ queries

// fill queries in here

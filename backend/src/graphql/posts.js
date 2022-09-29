import gql from 'graphql-tag'

// ------ mutations

export const createPostMutation = gql`
  mutation ($id: ID, $title: String!, $slug: String, $content: String!, $categoryIds: [ID]!) {
    CreatePost(id: $id, title: $title, slug: $slug, content: $content, categoryIds: $categoryIds) {
      id
      slug
    }
  }
`

// ------ queries

// fill queries in here

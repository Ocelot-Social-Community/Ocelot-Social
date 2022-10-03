import gql from 'graphql-tag'

// ------ mutations

export const createPostMutation = () => {
  return gql`
    mutation (
      $id: ID
      $title: String!
      $slug: String
      $content: String!
      $categoryIds: [ID]
      $groupId: ID
    ) {
      CreatePost(
        id: $id
        title: $title
        slug: $slug
        content: $content
        categoryIds: $categoryIds
        groupId: $groupId
      ) {
        id
        slug
        title
        content
      }
    }
  `
}

// ------ queries

export const postQuery = () => {
  return gql`
    query Post($id: ID!) {
      Post(id: $id) {
        id
        title
        content
      }
    }
  `
}

// fill queries in here

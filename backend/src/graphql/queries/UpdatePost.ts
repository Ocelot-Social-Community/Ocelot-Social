import gql from 'graphql-tag'

export const UpdatePost = gql`
  mutation ($id: ID!, $title: String!, $postContent: String!, $categoryIds: [ID]!) {
    UpdatePost(id: $id, content: $postContent, title: $title, categoryIds: $categoryIds) {
      title
      content
    }
  }
`

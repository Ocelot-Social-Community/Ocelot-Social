import gql from 'graphql-tag'

export const UpdatePost = gql`
  mutation (
    $id: ID!
    $title: String!
    $content: String!
    $image: ImageInput
    $categoryIds: [ID]
    $postType: PostType
    $eventInput: _EventInput
  ) {
    UpdatePost(
      id: $id
      title: $title
      content: $content
      image: $image
      categoryIds: $categoryIds
      postType: $postType
      eventInput: $eventInput
    ) {
      id
      title
      content
      author {
        name
        slug
      }
      createdAt
      updatedAt
      categories {
        id
      }
      postType
      eventStart
      eventLocationName
      eventVenue
      eventLocation {
        lng
        lat
      }
    }
  }
`

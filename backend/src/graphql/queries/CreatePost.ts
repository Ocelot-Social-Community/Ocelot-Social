import gql from 'graphql-tag'

export const CreatePost = gql`
  mutation (
    $id: ID
    $title: String!
    $slug: String
    $content: String!
    $categoryIds: [ID]
    $groupId: ID
    $postType: PostType
    $eventInput: _EventInput
  ) {
    CreatePost(
      id: $id
      title: $title
      slug: $slug
      content: $content
      categoryIds: $categoryIds
      groupId: $groupId
      postType: $postType
      eventInput: $eventInput
    ) {
      id
      slug
      title
      content
      disabled
      deleted
      postType
      author {
        name
      }
      categories {
        id
      }
      eventStart
      eventEnd
      eventLocationName
      eventVenue
      eventIsOnline
      eventLocation {
        lng
        lat
      }
      isObservedByMe
      observingUsersCount
    }
  }
`

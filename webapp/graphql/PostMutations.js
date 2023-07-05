import gql from 'graphql-tag'

export default () => {
  return {
    CreatePost: gql`
      mutation (
        $id: ID
        $title: String!
        $slug: String
        $content: String!
        $categoryIds: [ID]
        $image: ImageInput
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
          image: $image
          groupId: $groupId
          postType: $postType
          eventInput: $eventInput
        ) {
          id
          slug
          title
          content
          contentExcerpt
          language
          image {
            url
            sensitive
          }
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
          eventVenue
          eventLocationName
          eventLocation {
            lng
            lat
          }
        }
      }
    `,
    UpdatePost: gql`
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
          slug
          content
          contentExcerpt
          language
          image {
            url
            sensitive
            aspectRatio
          }
          pinnedBy {
            id
            name
            role
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
    `,
    DeletePost: gql`
      mutation ($id: ID!) {
        DeletePost(id: $id) {
          id
        }
      }
    `,
    AddPostEmotionsMutation: gql`
      mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
        AddPostEmotions(to: $to, data: $data) {
          emotion
          from {
            id
          }
          to {
            id
          }
        }
      }
    `,
    RemovePostEmotionsMutation: gql`
      mutation ($to: _PostInput!, $data: _EMOTEDInput!) {
        RemovePostEmotions(to: $to, data: $data) {
          emotion
          from {
            id
          }
          to {
            id
          }
        }
      }
    `,
    pinPost: gql`
      mutation ($id: ID!) {
        pinPost(id: $id) {
          id
          title
          slug
          content
          contentExcerpt
          language
          pinnedBy {
            id
            name
            role
          }
        }
      }
    `,
    unpinPost: gql`
      mutation ($id: ID!) {
        unpinPost(id: $id) {
          id
          title
          slug
          content
          contentExcerpt
          language
          pinnedBy {
            id
            name
            role
          }
        }
      }
    `,
    markTeaserAsViewed: gql`
      mutation ($id: ID!) {
        markTeaserAsViewed(id: $id) {
          id
        }
      }
    `,
  }
}

import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export default () => {
  return {
    CreatePost: gql`
      ${imageUrls}

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
            ...imageUrls
            sensitive
          }
          disabled
          deleted
          postType
          author {
            id
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
      ${imageUrls}

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
            ...imageUrls
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
    pushPost: gql`
      mutation ($id: ID!) {
        pushPost(id: $id) {
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
    unpushPost: gql`
      mutation ($id: ID!) {
        unpushPost(id: $id) {
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
    toggleObservePost: gql`
      mutation ($id: ID!, $value: Boolean!) {
        toggleObservePost(id: $id, value: $value) {
          isObservedByMe
          observingUsersCount
        }
      }
    `,
  }
}

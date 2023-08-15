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

export const filterPosts = () => {
  return gql`
    query Post($filter: _PostFilter, $first: Int, $offset: Int, $orderBy: [_PostOrdering]) {
      Post(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        id
        title
        content
        eventStart
      }
    }
  `
}

export const profilePagePosts = () => {
  return gql`
    query profilePagePosts(
      $filter: _PostFilter
      $first: Int
      $offset: Int
      $orderBy: [_PostOrdering]
    ) {
      profilePagePosts(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        id
        title
        content
      }
    }
  `
}

export const searchPosts = () => {
  return gql`
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
}

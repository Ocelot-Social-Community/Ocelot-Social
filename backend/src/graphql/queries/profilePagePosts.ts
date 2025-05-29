import gql from 'graphql-tag'

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

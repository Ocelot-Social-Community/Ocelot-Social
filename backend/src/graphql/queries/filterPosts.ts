import gql from 'graphql-tag'

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

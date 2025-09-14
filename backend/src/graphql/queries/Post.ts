import gql from 'graphql-tag'

export const Post = gql`
  query ($id: ID, $filter: _PostFilter, $first: Int, $offset: Int, $orderBy: [_PostOrdering]) {
    Post(id: $id, filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
      id
      title
      content
      eventStart
      pinned
      createdAt
      pinnedAt
      isObservedByMe
      observingUsersCount
      clickedCount
      emotionsCount
      emotions {
        emotion
        User {
          id
        }
      }
      author {
        id
        name
      }
      shoutedBy {
        id
      }
      tags {
        id
      }
      comments {
        content
      }
    }
  }
`

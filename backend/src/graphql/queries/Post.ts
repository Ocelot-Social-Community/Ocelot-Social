import gql from 'graphql-tag'

export const Post = gql`
  query ($id: ID, $filter: _PostFilter, $first: Int, $offset: Int, $orderBy: [_PostOrdering]) {
    Post(id: $id, filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
      id
      title
      content # in conflict with backend/src/graphql/resolvers/users/blockedUsers.spec.ts
      contentExcerpt
      eventStart
      pinned
      createdAt
      pinnedAt
      isObservedByMe # in conflict with backend/src/graphql/resolvers/shout.spec.ts
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

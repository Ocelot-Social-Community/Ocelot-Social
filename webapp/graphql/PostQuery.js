import gql from 'graphql-tag'
import { user } from './fragments/user'
import { post } from './fragments/post'
import { comment } from './fragments/comment'
import { postCounts } from './fragments/postCounts'
import { userCounts } from './fragments/userCounts'
import { location } from './fragments/location'
import { badges } from './fragments/badges'
import { tagsCategoriesAndPinned } from './fragments/tagsCategoriesAndPinned'

export default (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${user}
    ${userCounts}
    ${location('User', lang)}
    ${badges}
    ${post}
    ${postCounts}
    ${tagsCategoriesAndPinned}
    ${comment}

    query Post($id: ID!) {
      Post(id: $id) {
        postType
        eventStart
        eventEnd
        eventVenue
        eventLocationName
        eventLocation {
          id
          lat
          lng
        }
        eventIsOnline
        lat
        lng
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...locationOnUser
          ...badges
          blocked
        }
        comments(orderBy: createdAt_asc) {
          ...comment
          author {
            ...user
            ...userCounts
            ...locationOnUser
            ...badges
          }
        }
        unreadNotificationByCurrentUser {
          id
        }
        unreadCommentNotificationsByCurrentUser {
          id
          from {
            __typename
            ... on Comment {
              id
            }
          }
        }
      }
    }
  `
}

export const filterPosts = () => {
  return gql`
    ${user}
    ${post}
    ${postCounts}
    ${tagsCategoriesAndPinned}

    query Post($filter: _PostFilter, $first: Int, $offset: Int, $orderBy: [_PostOrdering]) {
      Post(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        postType
        eventStart
        eventEnd
        eventVenue
        eventLocationName
        eventIsOnline
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
      }
    }
  `
}

export const profilePagePosts = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${user}
    ${userCounts}
    ${location('User', lang)}
    ${badges}
    ${post}
    ${postCounts}
    ${tagsCategoriesAndPinned}

    query profilePagePosts(
      $filter: _PostFilter
      $first: Int
      $offset: Int
      $orderBy: [_PostOrdering]
    ) {
      profilePagePosts(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
        postType
        eventStart
        eventVenue
        eventLocationName
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...locationOnUser
          ...badges
        }
      }
    }
  `
}

// Compact, on-demand query for a single Event post — same self-contained
// "just an id, fetches its own data" shape as userTeaserQuery/groupTeaserQuery,
// used by the map's event marker popover instead of bloating MapQuery's own
// per-marker payload with data (image, author) only needed once a popup
// actually opens.
export const postTeaserQuery = () => {
  return gql`
    ${user}
    ${post}

    query ($id: ID!) {
      Post(id: $id) {
        ...post
        postType
        eventStart
        eventEnd
        eventVenue
        eventLocationName
        eventIsOnline
      }
    }
  `
}

export const postsPinnedCountsQuery = () => {
  return gql`
    query {
      PostsPinnedCounts {
        currentlyPinnedPosts
      }
    }
  `
}

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
        eventIsOnline
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...location
          ...badges
          blocked
        }
        comments(orderBy: createdAt_asc) {
          ...comment
          author {
            ...user
            ...userCounts
            ...location
            ...badges
          }
        }
      }
    }
  `
}

export const filterPosts = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${user}
    ${userCounts}
    ${location('User', lang)}
    ${badges}
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
        eventLocation {
          lng
          lat
        }
        eventIsOnline
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...location
          ...badges
        }
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
          ...location
          ...badges
        }
      }
    }
  `
}

export const PostsEmotionsByCurrentUser = () => {
  return gql`
    query PostsEmotionsByCurrentUser($postId: ID!) {
      PostsEmotionsByCurrentUser(postId: $postId)
    }
  `
}

export const relatedContributions = (i18n) => {
  const lang = i18n.locale().toUpperCase()
  return gql`
    ${user}
    ${userCounts}
    ${location('User', lang)}
    ${badges}
    ${post}
    ${postCounts}
    ${tagsCategoriesAndPinned}

    query Post($slug: String!) {
      Post(slug: $slug) {
        ...post
        ...postCounts
        ...tagsCategoriesAndPinned
        author {
          ...user
          ...userCounts
          ...location
          ...badges
        }
        relatedContributions(first: 2) {
          ...post
          ...postCounts
          ...tagsCategoriesAndPinned
          author {
            ...user
            ...userCounts
            ...location
            ...badges
          }
        }
      }
    }
  `
}

export const postsPinnedCountsQuery = () => {
  return gql`
    query {
      PostsPinnedCounts {
        maxPinnedPosts
        currentlyPinnedPosts
      }
    }
  `
}

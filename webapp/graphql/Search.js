import gql from 'graphql-tag'
import {
  userFragment,
  postFragment,
  groupFragment,
  tagsCategoriesAndPinnedFragment,
} from './Fragments'

export const searchQuery = gql`
  ${userFragment}
  ${postFragment}
  ${groupFragment}

  query ($query: String!) {
    searchResults(query: $query, limit: 5) {
      __typename
      ... on Post {
        ...post
        commentsCount
        shoutedCount
        clickedCount
        viewedTeaserCount
        author {
          ...user
        }
      }
      ... on User {
        ...user
      }
      ... on Tag {
        id
      }
      ... on Group {
        ...group
      }
    }
  }
`

export const searchPosts = gql`
  ${userFragment}
  ${postFragment}
  ${tagsCategoriesAndPinnedFragment}

  query ($query: String!, $firstPosts: Int, $postsOffset: Int) {
    searchPosts(query: $query, firstPosts: $firstPosts, postsOffset: $postsOffset) {
      postCount
      posts {
        __typename
        ...post
        ...tagsCategoriesAndPinned
        commentsCount
        shoutedCount
        clickedCount
        viewedTeaserCount
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
        author {
          ...user
        }
      }
    }
  }
`

export const searchGroups = (i18n) => {
  const lang = i18n ? i18n.locale().toUpperCase() : 'EN'
  return gql`
    query ($query: String!, $firstGroups: Int, $groupsOffset: Int) {
      searchGroups(query: $query, firstGroups: $firstGroups, groupsOffset: $groupsOffset) {
        groupCount
        groups {
          __typename
          id
          groupName: name
          slug
          createdAt
          updatedAt
          disabled
          deleted
          about
          description
          descriptionExcerpt
          groupType
          actionRadius
          categories {
            id
            slug
            name
            icon
         }
          avatar {
            url
          }
          locationName
          location {
            name: name${lang}
          }
          myRole
        }
      }
    }
  `
}

export const searchUsers = gql`
  ${userFragment}

  query ($query: String!, $firstUsers: Int, $usersOffset: Int) {
    searchUsers(query: $query, firstUsers: $firstUsers, usersOffset: $usersOffset) {
      userCount
      users {
        __typename
        ...user
      }
    }
  }
`

export const searchHashtags = gql`
  query ($query: String!, $firstHashtags: Int, $hashtagsOffset: Int) {
    searchHashtags(query: $query, firstHashtags: $firstHashtags, hashtagsOffset: $hashtagsOffset) {
      hashtagCount
      hashtags {
        __typename
        id
      }
    }
  }
`

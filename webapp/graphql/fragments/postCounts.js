import gql from 'graphql-tag'

export const postCounts = gql`
  fragment postCounts on Post {
    commentsCount
    shoutedCount
    shoutedByCurrentUser
    emotionsCount
    clickedCount
    viewedTeaserCount
    viewedTeaserByCurrentUser
  }
`

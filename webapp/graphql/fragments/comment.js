import gql from 'graphql-tag'

export const comment = gql`
  fragment comment on Comment {
    id
    createdAt
    updatedAt
    disabled
    deleted
    content
    contentExcerpt
    isPostObservedByMe
    postObservingUsersCount
    shoutedByCurrentUser
    shoutedCount
  }
`

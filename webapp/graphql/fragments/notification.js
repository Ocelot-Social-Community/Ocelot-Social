import gql from 'graphql-tag'
import { user } from './user'
import { comment } from './comment'
import { post } from './post'
import { group } from './group'

export const notificationMutationResponse = gql`
  ${user}
  ${comment}
  ${post}
  ${group}

  fragment notificationMutationResponse on NOTIFIED {
    id
    read
    reason
    createdAt
    updatedAt
    from {
      __typename
      ... on Post {
        ...post
        author {
          ...user
        }
      }
      ... on Comment {
        ...comment
        post {
          ...post
          author {
            ...user
          }
        }
      }
      ... on Group {
        ...group
      }
    }
  }
`

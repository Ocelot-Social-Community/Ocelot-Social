import gql from 'graphql-tag'

export const MarkMessagesAsSeen = gql`
  mutation ($messageIds: [String!]) {
    MarkMessagesAsSeen(messageIds: $messageIds)
  }
`

import gql from 'graphql-tag'

export const muteGroup = gql`
  mutation ($groupId: ID!) {
    muteGroup(groupId: $groupId) {
      id
      isMutedByMe
    }
  }
`

import gql from 'graphql-tag'

export const unmuteGroup = gql`
  mutation ($groupId: ID!) {
    unmuteGroup(groupId: $groupId) {
      id
      isMutedByMe
    }
  }
`

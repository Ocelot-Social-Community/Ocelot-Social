import gql from 'graphql-tag'

export const muteGroup = () => {
  return gql`
    mutation ($groupId: ID!) {
      muteGroup(groupId: $groupId) {
        id
        name
        isMutedByMe
      }
    }
  `
}

export const unmuteGroup = () => {
  return gql`
    mutation ($groupId: ID!) {
      unmuteGroup(groupId: $groupId) {
        id
        name
        isMutedByMe
      }
    }
  `
}

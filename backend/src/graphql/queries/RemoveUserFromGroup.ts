import gql from 'graphql-tag'

export const RemoveUserFromGroup = gql`
  mutation ($groupId: ID!, $userId: ID!) {
    RemoveUserFromGroup(groupId: $groupId, userId: $userId) {
      user {
        id
        name
        slug
      }
      membership {
        role
      }
    }
  }
`

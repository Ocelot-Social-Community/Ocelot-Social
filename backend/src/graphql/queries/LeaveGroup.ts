import gql from 'graphql-tag'

export const LeaveGroup = gql`
  mutation ($groupId: ID!, $userId: ID!) {
    LeaveGroup(groupId: $groupId, userId: $userId) {
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

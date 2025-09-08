import gql from 'graphql-tag'

export const LeaveGroup = gql`
  mutation ($groupId: ID!, $userId: ID!) {
    LeaveGroup(groupId: $groupId, userId: $userId) {
      id
      name
      slug
      myRoleInGroup
    }
  }
`

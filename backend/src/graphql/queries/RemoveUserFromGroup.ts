import gql from 'graphql-tag'

export const RemoveUserFromGroup = gql`
  mutation ($groupId: ID!, $userId: ID!) {
    RemoveUserFromGroup(groupId: $groupId, userId: $userId) {
      id
      name
      slug
      myRoleInGroup
    }
  }
`

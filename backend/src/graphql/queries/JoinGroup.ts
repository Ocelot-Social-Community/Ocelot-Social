import gql from 'graphql-tag'

export const JoinGroup = gql`
  mutation ($groupId: ID!, $userId: ID!) {
    JoinGroup(groupId: $groupId, userId: $userId) {
      id
      name
      slug
      myRoleInGroup
    }
  }
`

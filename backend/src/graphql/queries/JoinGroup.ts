import gql from 'graphql-tag'

export const JoinGroup = gql`
  mutation ($groupId: ID!, $userId: ID!) {
    JoinGroup(groupId: $groupId, userId: $userId) {
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

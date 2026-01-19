import gql from 'graphql-tag'

export const ChangeGroupMemberRole = gql`
  mutation ($groupId: ID!, $userId: ID!, $roleInGroup: GroupMemberRole!) {
    ChangeGroupMemberRole(groupId: $groupId, userId: $userId, roleInGroup: $roleInGroup) {
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

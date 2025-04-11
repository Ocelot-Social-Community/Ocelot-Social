import gql from 'graphql-tag'

export const leaveGroupMutation = () => {
  return gql`
    mutation ($groupId: ID!, $userId: ID!) {
      LeaveGroup(groupId: $groupId, userId: $userId) {
        id
        name
        slug
        myRoleInGroup
      }
    }
  `
}

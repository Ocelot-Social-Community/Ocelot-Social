import gql from 'graphql-tag'

export const groupMembersQuery = () => {
  return gql`
    query ($id: ID!) {
      GroupMembers(id: $id) {
        id
        name
        slug
        myRoleInGroup
      }
    }
  `
}

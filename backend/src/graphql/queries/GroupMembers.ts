import gql from 'graphql-tag'

export const GroupMembers = gql`
  query GroupMembers($id: ID!) {
    GroupMembers(id: $id) {
      id
      name
      slug
      myRoleInGroup
    }
  }
`

import gql from 'graphql-tag'

export const GroupMembers = gql`
  query GroupMembers($id: ID!) {
    GroupMembers(id: $id) {
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

import gql from 'graphql-tag'

export const Group = gql`
  query Group($id: ID!) {
    Group(id: $id) {
      myRole
    }
  }
`

import gql from 'graphql-tag'

export const unshout = gql`
  mutation ($id: ID!) {
    unshout(id: $id, type: Post)
  }
`

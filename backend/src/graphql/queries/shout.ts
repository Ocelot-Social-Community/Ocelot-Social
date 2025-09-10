import gql from 'graphql-tag'

export const shout = gql`
  mutation ($id: ID!) {
    shout(id: $id, type: Post)
  }
`

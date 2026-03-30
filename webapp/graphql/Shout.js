import gql from 'graphql-tag'

export const shoutMutation = gql`
  mutation ($id: ID!, $type: ShoutTypeEnum!) {
    shout(id: $id, type: $type)
  }
`

export const unshoutMutation = gql`
  mutation ($id: ID!, $type: ShoutTypeEnum!) {
    unshout(id: $id, type: $type)
  }
`

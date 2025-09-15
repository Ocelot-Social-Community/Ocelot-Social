import gql from 'graphql-tag'

export const updateOnlineStatus = gql`
  mutation ($status: OnlineStatus!) {
    updateOnlineStatus(status: $status)
  }
`

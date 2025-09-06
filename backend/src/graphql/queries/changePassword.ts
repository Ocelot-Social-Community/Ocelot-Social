import gql from 'graphql-tag'

export const changePassword = gql`
  mutation ($oldPassword: String!, $newPassword: String!) {
    changePassword(oldPassword: $oldPassword, newPassword: $newPassword)
  }
`

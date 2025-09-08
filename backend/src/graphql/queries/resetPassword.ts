import gql from 'graphql-tag'

export const resetPassword = gql`
  mutation ($nonce: String!, $email: String!, $newPassword: String!) {
    resetPassword(nonce: $nonce, email: $email, newPassword: $newPassword)
  }
`

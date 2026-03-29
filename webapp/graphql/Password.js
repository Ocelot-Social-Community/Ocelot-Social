import gql from 'graphql-tag'

export const changePasswordMutation = gql`
  mutation ($oldPassword: String!, $password: String!) {
    changePassword(oldPassword: $oldPassword, newPassword: $password)
  }
`

export const resetPasswordMutation = gql`
  mutation ($nonce: String!, $email: String!, $password: String!) {
    resetPassword(nonce: $nonce, email: $email, newPassword: $password)
  }
`

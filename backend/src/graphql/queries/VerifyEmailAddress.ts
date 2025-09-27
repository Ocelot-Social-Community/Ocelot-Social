import gql from 'graphql-tag'

export const VerifyEmailAddress = gql`
  mutation ($email: String!, $nonce: String!) {
    VerifyEmailAddress(email: $email, nonce: $nonce) {
      email
      createdAt
      verifiedAt
    }
  }
`

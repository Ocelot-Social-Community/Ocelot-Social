import gql from 'graphql-tag'

export const VerifyNonce = gql`
  query ($email: String!, $nonce: String!) {
    VerifyNonce(email: $email, nonce: $nonce)
  }
`

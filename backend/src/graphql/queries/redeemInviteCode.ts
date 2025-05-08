import gql from 'graphql-tag'

export const redeemInviteCode = gql`
  mutation redeemInviteCode($code: String!) {
    redeemInviteCode(code: $code)
  }
`

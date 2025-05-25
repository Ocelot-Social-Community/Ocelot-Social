import gql from 'graphql-tag'

export const validateInviteCodeQuery = gql`
  query ($code: String!) {
    validateInviteCode(code: $code) {
      invitedTo {
        id
        slug
        groupType
      }
    }
  }
`

export const redeemInviteCodeMutation = gql`
  mutation ($code: String!) {
    redeemInviteCode(code: $code)
  }
`

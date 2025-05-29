import gql from 'graphql-tag'

export const invalidateInviteCode = gql`
  mutation invalidateInviteCode($code: String!) {
    invalidateInviteCode(code: $code) {
      code
      createdAt
      generatedBy {
        id
        name
        avatar {
          url
        }
      }
      redeemedBy {
        id
        name
        avatar {
          url
        }
      }
      expiresAt
      comment
      invitedTo {
        id
        groupType
        name
        about
        avatar {
          url
        }
      }
      isValid
    }
  }
`

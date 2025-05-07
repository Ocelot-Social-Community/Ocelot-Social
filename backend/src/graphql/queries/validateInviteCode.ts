import gql from 'graphql-tag'

export const unauthenticatedValidateInviteCode = gql`
  query validateInviteCode($code: String!) {
    validateInviteCode(code: $code) {
      code
      invitedTo {
        name
        avatar {
          url
        }
      }
      generatedBy {
        name
        avatar {
          url
        }
      }
      isValid
    }
  }
`

export const authenticatedValidateInviteCode = gql`
  query validateInviteCode($code: String!) {
    validateInviteCode(code: $code) {
      code
      invitedTo {
        id
        name
        avatar {
          url
        }
      }
      generatedBy {
        id
        name
        avatar {
          url
        }
      }
      isValid
    }
  }
`

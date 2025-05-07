import gql from 'graphql-tag'

export const validateInviteCode = () => gql`
  query validateInviteCode($code: String!) {
    validateInviteCode(code: $code) {
      code
      invitedTo {
        groupType
        name
        about
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

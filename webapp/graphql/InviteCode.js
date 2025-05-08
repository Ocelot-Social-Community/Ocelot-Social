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

export const generatePersonalInviteCode = () => gql`
  generatePersonalInviteCode($expiresAt: String, $comment: String) {
    generatePersonalInviteCode(expiresAt: $expiresAt, comment: $comment) {
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

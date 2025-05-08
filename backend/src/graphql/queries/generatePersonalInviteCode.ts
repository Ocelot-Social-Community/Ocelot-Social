import gql from 'graphql-tag'

export const generatePersonalInviteCode = gql`
  mutation generatePersonalInviteCode($expiresAt: String, $comment: String) {
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

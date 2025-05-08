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
      redeemedByCount
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

export const generateGroupInviteCode = () => gql`
  mutation generateGroupInviteCode($groupId: ID!, $expiresAt: String, $comment: String) {
    generateGroupInviteCode(groupId: $groupId, expiresAt: $expiresAt, comment: $comment) {
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
      redeemedByCount
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

export const invalidateInviteCode = () => gql`
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
      redeemedByCount
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

export const redeemInviteCode = () => gql`
  mutation redeemInviteCode($code: String!) {
    redeemInviteCode(code: $code)
  }
`

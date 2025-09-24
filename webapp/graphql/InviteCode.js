import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export const validateInviteCode = () => gql`
  ${imageUrls}

  query validateInviteCode($code: String!) {
    validateInviteCode(code: $code) {
      code
      invitedTo {
        slug
        groupType
        name
        about
        avatar {
          ...imageUrls
        }
      }
      generatedBy {
        name
        avatar {
          ...imageUrls
        }
      }
      isValid
    }
  }
`

export const generatePersonalInviteCode = () => gql`
  ${imageUrls}

  mutation generatePersonalInviteCode($expiresAt: String, $comment: String) {
    generatePersonalInviteCode(expiresAt: $expiresAt, comment: $comment) {
      code
      createdAt
      generatedBy {
        id
        name
        avatar {
          ...imageUrls
        }
      }
      redeemedBy {
        id
        name
        avatar {
          ...imageUrls
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
          ...imageUrls
        }
      }
      isValid
    }
  }
`

export const generateGroupInviteCode = () => gql`
  ${imageUrls}

  mutation generateGroupInviteCode($groupId: ID!, $expiresAt: String, $comment: String) {
    generateGroupInviteCode(groupId: $groupId, expiresAt: $expiresAt, comment: $comment) {
      code
      createdAt
      generatedBy {
        id
        name
        avatar {
          ...imageUrls
        }
      }
      redeemedBy {
        id
        name
        avatar {
          ...imageUrls
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
          ...imageUrls
        }
      }
      isValid
    }
  }
`

export const invalidateInviteCode = () => gql`
  ${imageUrls}

  mutation invalidateInviteCode($code: String!) {
    invalidateInviteCode(code: $code) {
      code
      createdAt
      generatedBy {
        id
        name
        avatar {
          ...imageUrls
        }
      }
      redeemedBy {
        id
        name
        avatar {
          ...imageUrls
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
          ...imageUrls
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

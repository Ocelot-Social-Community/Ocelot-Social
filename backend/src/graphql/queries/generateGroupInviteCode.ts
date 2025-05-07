import gql from 'graphql-tag'

export const generateGroupInviteCode = gql`
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

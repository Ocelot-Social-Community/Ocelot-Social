import gql from 'graphql-tag'

export const videoCallConfigQuery = () => gql`
  query {
    videoCallConfig {
      enabled
    }
  }
`

export const videoCallParticipantCountQuery = () => gql`
  query ($groupId: ID!) {
    videoCallParticipantCount(groupId: $groupId)
  }
`

export const joinGroupVideoCallMutation = () => gql`
  mutation ($groupId: ID!) {
    joinGroupVideoCall(groupId: $groupId) {
      token
      url
      roomName
    }
  }
`

export const videoCallParticipantCountChangedSubscription = () => gql`
  subscription ($groupId: ID!) {
    videoCallParticipantCountChanged(groupId: $groupId) {
      groupId
      count
    }
  }
`

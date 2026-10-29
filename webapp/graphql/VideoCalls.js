import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

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

const activeVideoCallFields = gql`
  ${imageUrls}

  fragment activeVideoCall on ActiveVideoCall {
    group {
      id
      slug
      name
      visibility
      avatar {
        ...imageUrls
      }
    }
    participantCount
    participants {
      id
      slug
      name
      isBlocked
      avatar {
        ...imageUrls
      }
    }
  }
`

export const activeVideoCallsQuery = () => gql`
  ${activeVideoCallFields}

  query {
    activeVideoCalls {
      ...activeVideoCall
    }
  }
`

export const activeVideoCallChangedSubscription = () => gql`
  ${activeVideoCallFields}

  subscription {
    activeVideoCallChanged {
      groupId
      call {
        ...activeVideoCall
      }
    }
  }
`

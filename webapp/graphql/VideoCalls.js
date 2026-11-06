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

// Asked once connected: the conference chat is for those in the call, and which call that is
// only shows once the client is in its room.
export const joinGroupVideoCallChatMutation = () => gql`
  mutation ($groupId: ID!) {
    joinGroupVideoCallChat(groupId: $groupId)
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

// Moderating a running call. Who moderates, who has the floor and whether everybody moderates
// arrive with the room's metadata (see VideoCall.vue); these are the acts.
export const videoCallModerationRightsQuery = () => gql`
  query ($groupId: ID!, $userId: ID!) {
    videoCallModerationRights(groupId: $groupId, userId: $userId) {
      userId
      remove
      revokeModeration
    }
  }
`

export const videoCallModerationSuccessorQuery = () => gql`
  query ($groupId: ID!) {
    videoCallModerationSuccessor(groupId: $groupId)
  }
`

export const moderateVideoCallParticipantMutation = () => gql`
  mutation ($groupId: ID!, $userId: ID!, $action: VideoCallModerationAction!) {
    moderateVideoCallParticipant(groupId: $groupId, userId: $userId, action: $action)
  }
`

export const muteAllInVideoCallMutation = () => gql`
  mutation ($groupId: ID!, $exceptUserIds: [ID!]!, $floorUserIds: [ID!]!) {
    muteAllInVideoCall(
      groupId: $groupId
      exceptUserIds: $exceptUserIds
      floorUserIds: $floorUserIds
    )
  }
`

export const setVideoCallModeratorMutation = () => gql`
  mutation ($groupId: ID!, $userId: ID!, $moderator: Boolean!) {
    setVideoCallModerator(groupId: $groupId, userId: $userId, moderator: $moderator)
  }
`

export const setVideoCallEveryoneModeratesMutation = () => gql`
  mutation ($groupId: ID!, $enabled: Boolean!) {
    setVideoCallEveryoneModerates(groupId: $groupId, enabled: $enabled)
  }
`

export const takeOverVideoCallModerationMutation = () => gql`
  mutation ($groupId: ID!) {
    takeOverVideoCallModeration(groupId: $groupId)
  }
`

export const setVideoCallFloorMutation = () => gql`
  mutation ($groupId: ID!, $userId: ID!, $floor: Boolean!) {
    setVideoCallFloor(groupId: $groupId, userId: $userId, floor: $floor)
  }
`

export const handOverVideoCallModerationMutation = () => gql`
  mutation ($groupId: ID!, $toUserId: ID, $everyone: Boolean) {
    handOverVideoCallModeration(groupId: $groupId, toUserId: $toUserId, everyone: $everyone)
  }
`

// Whether the viewer may step into the moderation of the group's calls (group.videoCall.moderate).
export const videoCallGroupPermissionsQuery = () => gql`
  query ($id: ID!) {
    Group(id: $id) {
      id
      myGroupPermissions
    }
  }
`

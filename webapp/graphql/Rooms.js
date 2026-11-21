import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export const createGroupRoom = () => gql`
  ${imageUrls}

  mutation ($groupId: ID!) {
    CreateGroupRoom(groupId: $groupId) {
      id
      roomId
      roomName
      avatar
      isGroupRoom
      lastMessageAt
      createdAt
      unreadCount
      group {
        id
        name
        slug
        avatar {
          ...imageUrls
        }
      }
      users {
        _id
        id
        slug
        name
        avatar {
          ...imageUrls
        }
      }
    }
  }
`

export const roomQuery = () => gql`
  ${imageUrls}

  query Room($first: Int, $before: String, $id: ID, $userId: ID, $groupId: ID, $search: String) {
    Room(
      first: $first
      before: $before
      id: $id
      userId: $userId
      groupId: $groupId
      search: $search
    ) {
      id
      roomId
      roomName
      avatar
      isGroupRoom
      isCallRoom
      isWritable
      lastMessageAt
      createdAt
      unreadCount
      draft
      draftFiles {
        url
        name
        extension
        type
        duration
      }
      group {
        id
        name
        slug
        avatar {
          ...imageUrls
        }
      }
      lastMessage {
        _id
        id
        content
        senderId
        username
        avatar
        date
        saved
        distributed
        seen
        files {
          url
          name
          extension
          type
          duration
        }
      }
      users {
        _id
        id
        slug
        name
        avatar {
          ...imageUrls
        }
      }
    }
  }
`

// Keeps what the user has begun to write in a room, or takes it away for an empty text. By
// userId for a direct conversation that has no room yet: the room is opened for the draft.
export const saveRoomDraft = () => gql`
  mutation ($roomId: ID, $userId: ID, $text: String) {
    SaveRoomDraft(roomId: $roomId, userId: $userId, text: $text) {
      id
      draft
    }
  }
`

// Attaches a file to the user's draft in a room, uploaded at once; named as for saveRoomDraft.
export const addRoomDraftFile = () => gql`
  mutation ($roomId: ID, $userId: ID, $file: FileInput!) {
    AddRoomDraftFile(roomId: $roomId, userId: $userId, file: $file) {
      url
      name
      extension
      type
      duration
    }
  }
`

export const removeRoomDraftFile = () => gql`
  mutation ($roomId: ID, $userId: ID, $url: ID!) {
    RemoveRoomDraftFile(roomId: $roomId, userId: $userId, url: $url)
  }
`

export const userProfileQuery = () => gql`
  ${imageUrls}

  query ($id: ID!) {
    User(id: $id) {
      id
      slug
      name
      avatar {
        ...imageUrls
      }
    }
  }
`

export const unreadRoomsQuery = () => {
  return gql`
    query {
      UnreadRooms
    }
  `
}

export const roomUnreadQuery = () => gql`
  query Room($id: ID, $userId: ID, $groupId: ID) {
    Room(id: $id, userId: $userId, groupId: $groupId) {
      id
      unreadCount
    }
  }
`

export const roomUpdated = () => {
  return gql`
    subscription roomUpdated {
      roomUpdated {
        id
        unreadCount
        lastMessageAt
      }
    }
  `
}

export const roomUnreadFragment = gql`
  fragment RoomUnreadFragment on Room {
    id
    unreadCount
  }
`

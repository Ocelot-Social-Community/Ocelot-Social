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

  query Room($first: Int, $before: String, $id: ID, $userId: ID, $groupId: ID) {
    Room(first: $first, before: $before, id: $id, userId: $userId, groupId: $groupId) {
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
          type
          duration
        }
      }
      users {
        _id
        id
        name
        avatar {
          ...imageUrls
        }
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

export const roomCountUpdated = () => {
  return gql`
    subscription roomCountUpdated {
      roomCountUpdated
    }
  `
}

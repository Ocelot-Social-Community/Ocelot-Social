import gql from 'graphql-tag'
import { imageUrls } from './fragments/imageUrls'

export const createRoom = () => gql`
  ${imageUrls}

  mutation ($userId: ID!) {
    CreateRoom(userId: $userId) {
      id
      roomId
      roomName
      lastMessageAt
      createdAt
      unreadCount
      #avatar
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

  query Room($first: Int, $offset: Int, $id: ID) {
    Room(first: $first, offset: $offset, id: $id, orderBy: [createdAt_desc, lastMessageAt_desc]) {
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

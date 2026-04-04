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

  query Room($first: Int, $before: String, $id: ID, $userId: ID, $groupId: ID, $search: String) {
    Room(first: $first, before: $before, id: $id, userId: $userId, groupId: $groupId, search: $search) {
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
          extension
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

export const userProfileQuery = () => gql`
  ${imageUrls}

  query ($id: ID!) {
    User(id: $id) {
      id
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

export const roomCountUpdated = () => {
  return gql`
    subscription roomCountUpdated {
      roomCountUpdated
    }
  `
}

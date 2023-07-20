import gql from 'graphql-tag'

export const createRoom = () => gql`
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
          url
        }
      }
    }
  }
`

export const roomQuery = () => gql`
  query Room($first: Int, $offset: Int, $id: ID) {
    Room(first: $first, offset: $offset, id: $id, orderBy: [createdAt_desc, lastMessageAt_desc]) {
      id
      roomId
      roomName
      avatar
      lastMessageAt
      createdAt
      unreadCount
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
          url
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

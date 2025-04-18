import gql from 'graphql-tag'

export const unreadRoomsQuery = () => {
  return gql`
    query {
      UnreadRooms
    }
  `
}

import gql from 'graphql-tag'

export const RoomQuery = () => gql`
 query {
        Room {
          id
          users {
            id
          }
        }
      }
`

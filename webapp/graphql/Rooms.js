import gql from 'graphql-tag'

export const roomQuery = () => gql`
  query {
    Room {
      id
      users {
        id
      }
    }
  }
`

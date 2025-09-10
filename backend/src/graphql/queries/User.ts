import gql from 'graphql-tag'

export const User = gql`
  query ($name: String) {
    User(name: $name) {
      email
    }
  }
`

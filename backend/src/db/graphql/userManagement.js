import gql from 'graphql-tag'

// ------ mutations

export const loginMutation = gql`
  mutation ($email: String!, $password: String!) {
    login(email: $email, password: $password)
  }
`

// ------ queries

// fill queries in here

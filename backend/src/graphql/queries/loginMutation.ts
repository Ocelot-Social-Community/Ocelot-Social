import gql from 'graphql-tag'

export const loginMutation = gql`
  mutation ($email: String!, $password: String!) {
    login(email: $email, password: $password)
  }
`

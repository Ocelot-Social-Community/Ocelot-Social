import gql from 'graphql-tag'

export const login = gql`
  mutation ($email: String!, $password: String!) {
    login(email: $email, password: $password)
  }
`

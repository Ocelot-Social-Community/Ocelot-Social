import gql from 'graphql-tag'

export const Signup = gql`
  mutation ($email: String!, $locale: String!, $inviteCode: String) {
    Signup(email: $email, locale: $locale, inviteCode: $inviteCode) {
      email
    }
  }
`

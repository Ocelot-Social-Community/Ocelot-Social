import gql from 'graphql-tag'

export const requestPasswordReset = gql`
  mutation ($email: String!, $locale: String!) {
    requestPasswordReset(email: $email, locale: $locale)
  }
`

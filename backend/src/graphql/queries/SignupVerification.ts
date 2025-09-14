import gql from 'graphql-tag'

export const SignupVerification = gql`
  mutation (
    $password: String!
    $email: String!
    $name: String!
    $slug: String
    $nonce: String!
    $termsAndConditionsAgreedVersion: String!
    $about: String
    $locale: String
  ) {
    SignupVerification(
      email: $email
      password: $password
      name: $name
      slug: $slug
      nonce: $nonce
      termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
      about: $about
      locale: $locale
    ) {
      id
      slug
      termsAndConditionsAgreedVersion
      termsAndConditionsAgreedAt
    }
  }
`

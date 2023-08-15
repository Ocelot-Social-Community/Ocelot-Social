import gql from 'graphql-tag'
export const SignupVerificationMutation = gql`
  mutation (
    $nonce: String!
    $name: String!
    $email: String!
    $inviteCode: String
    $password: String!
    $about: String
    $termsAndConditionsAgreedVersion: String!
    $locale: String
  ) {
    SignupVerification(
      nonce: $nonce
      email: $email
      inviteCode: $inviteCode
      name: $name
      password: $password
      about: $about
      termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
      locale: $locale
    ) {
      id
      name
      slug
    }
  }
`

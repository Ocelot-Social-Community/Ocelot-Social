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
    $locationName: String
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
      locationName: $locationName
    ) {
      id
      name
      slug
    }
  }
`

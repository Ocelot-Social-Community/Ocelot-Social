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
    $locationId: ID
    $lat: Float
    $lng: Float
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
      locationId: $locationId
      lat: $lat
      lng: $lng
    ) {
      id
      name
      slug
    }
  }
`

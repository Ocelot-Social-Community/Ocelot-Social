import gql from 'graphql-tag'

// ------ mutations

export const signupVerificationMutation = gql`
  mutation (
    $password: String!
    $email: String!
    $name: String!
    $slug: String
    $nonce: String!
    $termsAndConditionsAgreedVersion: String!
  ) {
    SignupVerification(
      email: $email
      password: $password
      name: $name
      slug: $slug
      nonce: $nonce
      termsAndConditionsAgreedVersion: $termsAndConditionsAgreedVersion
    ) {
      id
      slug
    }
  }
`

// ------ queries

// fill queries in here

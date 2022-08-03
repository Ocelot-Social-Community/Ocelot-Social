import gql from 'graphql-tag'

export const createGroupMutation = gql`
  mutation (
    $id: ID,
    $name: String!,
    $slug: String,
    $about: String,
    $categoryIds: [ID]
  ) {
    CreateGroup(
      id: $id
      name: $name
      slug: $slug
      about: $about
      categoryIds: $categoryIds
    ) {
      id
      name
      slug
      about
      disabled
      deleted
      owner {
        name
      }
    }
  }
`

export const createPostMutation = gql`
  mutation ($title: String!, $content: String!, $categoryIds: [ID]!, $slug: String) {
    CreatePost(title: $title, content: $content, categoryIds: $categoryIds, slug: $slug) {
      slug
    }
  }
`

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
      slug
    }
  }
`

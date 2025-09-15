import gql from 'graphql-tag'

export const AddEmailAddress = gql`
  mutation ($email: String!) {
    AddEmailAddress(email: $email) {
      email
      verifiedAt
      createdAt
    }
  }
`

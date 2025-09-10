import gql from 'graphql-tag'

export const DeleteSocialMedia = gql`
  mutation ($id: ID!) {
    DeleteSocialMedia(id: $id) {
      id
      url
    }
  }
`

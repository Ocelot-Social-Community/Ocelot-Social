import gql from 'graphql-tag'

export const UpdateSocialMedia = gql`
  mutation ($id: ID!, $url: String!) {
    UpdateSocialMedia(id: $id, url: $url) {
      id
      url
    }
  }
`

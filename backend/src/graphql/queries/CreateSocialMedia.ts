import gql from 'graphql-tag'

export const CreateSocialMedia = gql`
  mutation ($url: String!) {
    CreateSocialMedia(url: $url) {
      id
      url
      url
      ownedBy {
        name
      }
    }
  }
`

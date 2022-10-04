import gql from 'graphql-tag'

// ------ mutations

export const createSocialMediaMutation = () => {
  return gql`
    mutation ($url: String!) {
      CreateSocialMedia(url: $url) {
        id
        url
      }
    }
  `
}

export const updateSocialMediaMutation = () => {
  return gql`
    mutation ($id: ID!, $url: String!) {
      UpdateSocialMedia(id: $id, url: $url) {
        id
        url
      }
    }
  `
}

export const deleteSocialMediaMutation = () => {
  return gql`
    mutation ($id: ID!) {
      DeleteSocialMedia(id: $id) {
        id
        url
      }
    }
  `
}

// ------ queries

// put the queries here

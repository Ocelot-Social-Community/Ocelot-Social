import gql from 'graphql-tag'
import { imageUrls } from '../fragments/imageUrls'

export const mutedUsers = () => {
  return gql`
    ${imageUrls}

    query {
      mutedUsers {
        id
        name
        slug
        avatar {
          ...imageUrls
        }
        about
        disabled
        deleted
      }
    }
  `
}

export const muteUser = () => {
  return gql`
    mutation ($id: ID!) {
      muteUser(id: $id) {
        id
        name
        isMuted
        followedByCurrentUser
      }
    }
  `
}

export const unmuteUser = () => {
  return gql`
    mutation ($id: ID!) {
      unmuteUser(id: $id) {
        id
        name
        isMuted
        followedByCurrentUser
      }
    }
  `
}

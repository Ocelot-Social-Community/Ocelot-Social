import gql from 'graphql-tag'
import { imageUrls } from '../fragments/imageUrls'

export const blockedUsers = () => {
  return gql`
    ${imageUrls}

    query {
      blockedUsers {
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

export const blockUser = () => {
  return gql`
    mutation ($id: ID!) {
      blockUser(id: $id) {
        id
        name
        blocked
        followedByCurrentUser
      }
    }
  `
}

export const unblockUser = () => {
  return gql`
    mutation ($id: ID!) {
      unblockUser(id: $id) {
        id
        name
        blocked
        followedByCurrentUser
      }
    }
  `
}

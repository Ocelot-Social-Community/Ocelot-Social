import gql from 'graphql-tag'
import { imageUrls } from '../fragments/imageUrls'

export const apiKeyUsersQuery = () => {
  return gql`
    ${imageUrls}

    query ($first: Int, $offset: Int) {
      apiKeyUsers(first: $first, offset: $offset) {
        user {
          id
          name
          slug
          avatar {
            ...imageUrls
          }
        }
        activeCount
        revokedCount
        postsCount
        commentsCount
        lastActivity
      }
    }
  `
}

export const apiKeysForUserQuery = () => {
  return gql`
    query ($userId: ID!) {
      apiKeysForUser(userId: $userId) {
        id
        name
        keyPrefix
        createdAt
        lastUsedAt
        expiresAt
        disabled
        disabledAt
      }
    }
  `
}

export const adminRevokeApiKeyMutation = () => {
  return gql`
    mutation ($id: ID!) {
      adminRevokeApiKey(id: $id)
    }
  `
}

export const adminRevokeUserApiKeysMutation = () => {
  return gql`
    mutation ($userId: ID!) {
      adminRevokeUserApiKeys(userId: $userId)
    }
  `
}

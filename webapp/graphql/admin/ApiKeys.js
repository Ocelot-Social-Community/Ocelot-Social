import gql from 'graphql-tag'

export const apiKeyUsersQuery = () => {
  return gql`
    query ($orderBy: ApiKeyUserOrder, $first: Int, $offset: Int) {
      apiKeyUsers(orderBy: $orderBy, first: $first, offset: $offset) {
        user {
          id
          name
          slug
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

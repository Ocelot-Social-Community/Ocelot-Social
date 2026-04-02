import gql from 'graphql-tag'

export const allApiKeysQuery = () => {
  return gql`
    query ($orderBy: ApiKeyOrder, $first: Int, $offset: Int) {
      allApiKeys(orderBy: $orderBy, first: $first, offset: $offset) {
        apiKey {
          id
          name
          keyPrefix
          createdAt
          lastUsedAt
          expiresAt
          disabled
        }
        owner {
          id
          name
          slug
        }
        postsCount
        commentsCount
        lastContentAt
      }
    }
  `
}

export const contentByApiKeyQuery = () => {
  return gql`
    query ($apiKeyId: ID!) {
      contentByApiKey(apiKeyId: $apiKeyId) {
        posts {
          id
          title
          slug
          createdAt
        }
        comments {
          id
          contentExcerpt
          createdAt
        }
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

import gql from 'graphql-tag'

export const myApiKeysQuery = () => {
  return gql`
    query {
      myApiKeys {
        id
        name
        keyPrefix
        createdAt
        lastUsedAt
        expiresAt
        disabled
      }
    }
  `
}

export const createApiKeyMutation = () => {
  return gql`
    mutation ($name: String!, $expiresInDays: Int) {
      createApiKey(name: $name, expiresInDays: $expiresInDays) {
        apiKey {
          id
          name
          keyPrefix
          createdAt
          expiresAt
          disabled
        }
        secret
      }
    }
  `
}

export const updateApiKeyMutation = () => {
  return gql`
    mutation ($id: ID!, $name: String!) {
      updateApiKey(id: $id, name: $name) {
        id
        name
      }
    }
  `
}

export const revokeApiKeyMutation = () => {
  return gql`
    mutation ($id: ID!) {
      revokeApiKey(id: $id)
    }
  `
}

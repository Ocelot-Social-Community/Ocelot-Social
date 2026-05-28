import {
  myApiKeysQuery,
  createApiKeyMutation,
  updateApiKeyMutation,
  revokeApiKeyMutation,
} from './ApiKeys.js'

const printOp = (doc) => doc.loc.source.body.replace(/\s+/g, ' ').trim()

describe('graphql/settings/ApiKeys', () => {
  it('builds the myApiKeys query with all fields', () => {
    const op = printOp(myApiKeysQuery())
    expect(op).toContain('myApiKeys {')
    expect(op).toMatch(/id\s+name\s+keyPrefix\s+createdAt\s+lastUsedAt\s+expiresAt\s+disabled\s+disabledAt/)
  })

  it('builds the createApiKey mutation with apiKey + secret return shape', () => {
    const op = printOp(createApiKeyMutation())
    expect(op).toContain('createApiKey(name: $name, expiresInDays: $expiresInDays)')
    expect(op).toContain('apiKey {')
    expect(op).toContain('secret')
  })

  it('builds the updateApiKey mutation with name return value', () => {
    const op = printOp(updateApiKeyMutation())
    expect(op).toContain('updateApiKey(id: $id, name: $name) { id name }')
  })

  it('builds the revokeApiKey mutation', () => {
    const op = printOp(revokeApiKeyMutation())
    expect(op).toContain('revokeApiKey(id: $id)')
  })
})

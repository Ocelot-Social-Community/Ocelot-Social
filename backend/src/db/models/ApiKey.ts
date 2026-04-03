export default {
  id: { type: 'uuid', primary: true },
  name: { type: 'string', required: true },
  keyHash: { type: 'string', unique: 'true', required: true },
  keyPrefix: { type: 'string', required: true },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  lastUsedAt: { type: 'string', isoDate: true },
  expiresAt: { type: 'string', isoDate: true },
  disabled: { type: 'boolean', default: false },
  owner: {
    type: 'relationship',
    relationship: 'HAS_API_KEY',
    target: 'User',
    direction: 'in',
  },
}

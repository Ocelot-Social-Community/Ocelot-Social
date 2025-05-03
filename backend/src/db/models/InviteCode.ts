export default {
  code: { type: 'string', primary: true },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  expiresAt: { type: 'string', isoDate: true, default: null },
  generated: {
    type: 'relationship',
    relationship: 'GENERATED',
    target: 'User',
    direction: 'in',
  },
  redeemed: {
    type: 'relationship',
    relationship: 'REDEEMED',
    target: 'User',
    direction: 'in',
  },
}

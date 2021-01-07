export default {
  code: { type: 'string', primary: true },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  uses: { type: 'int', default: () => 0 },
  maxUses: { type: 'int', default: () => 1 },
  active: { type: 'boolean', default: () => true },
  createdBy: {
    type: 'relationship',
    relationship: 'CREATED',
    target: 'User',
    direction: 'in',
  },
  usedBy: {
    type: 'relationship',
    relationship: 'USED',
    target: 'User',
    direction: 'in',
  },
}

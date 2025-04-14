export default {
  id: { type: 'string', primary: true, lowercase: true },
  type: { type: 'string', valid: ['verification', 'badge'] },
  icon: { type: 'string', required: true },
  description: { type: 'string', required: true },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
}

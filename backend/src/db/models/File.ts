export default {
  url: { primary: true, type: 'string', uri: { allowRelative: true } },
  name: { type: 'string' },
  type: { type: 'string' },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  updatedAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
}

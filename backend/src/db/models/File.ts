export default {
  url: { primary: true, type: 'string', uri: { allowRelative: true } },
  name: { type: 'string' },
  extension: { type: 'string', allow: [null, ''] },
  type: { type: 'string' },
  duration: { type: 'number', allow: [null] },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  updatedAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
}

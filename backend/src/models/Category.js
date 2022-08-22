import { v4 as uuid } from 'uuid'

export default {
  id: { type: 'string', primary: true, default: uuid },
  slug: { type: 'string', unique: 'true' },
  icon: { type: 'string', required: true, default: false },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  updatedAt: {
    type: 'string',
    isoDate: true,
    required: false,
  },
  post: {
    type: 'relationship',
    relationship: 'CATEGORIZED',
    target: 'Post',
    direction: 'in',
  },
}

import { v4 as uuid } from 'uuid'

export default {
  id: { type: 'string', primary: true, default: uuid },
  showDonations: { type: 'boolean' },
  goal: { type: 'number' },
  progress: { type: 'number' },
  createdAt: { type: 'string', isoDate: true, default: () => new Date().toISOString() },
  updatedAt: {
    type: 'string',
    isoDate: true,
    required: true,
    default: () => new Date().toISOString(),
  },
}

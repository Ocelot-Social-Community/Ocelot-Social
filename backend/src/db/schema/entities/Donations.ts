import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Donations.ts. A singleton in practice: one node holds the
 * network-wide donation goal. The label is plural because the model is.
 */
export const Donations = defineEntity({
  label: 'Donations',
  properties: {
    id: { type: 'string' },
    showDonations: { type: 'boolean' },
    goal: { type: 'number' },
    progress: { type: 'number' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'showDonations', 'goal', 'progress', 'createdAt', 'updatedAt'],
  unique: ['id'],
})

import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Migration.ts. Bookkeeping for the migrate tool, not domain data.
 * `timestamp` is stored as a float (the store writes it straight from JS).
 */
export const Migration = defineEntity({
  label: 'Migration',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    timestamp: { type: 'number' },
    migratedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['title', 'timestamp', 'migratedAt'],
  unique: ['title'],
})

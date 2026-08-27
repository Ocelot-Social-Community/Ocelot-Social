import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Report.ts. The report itself carries almost nothing — the
 * substance (reason, review decisions) sits on the FILED and REVIEWED edges.
 */
export const Report = defineEntity({
  label: 'Report',
  properties: {
    id: { type: 'string' },
    rule: { type: 'string' },
    closed: { type: 'boolean' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'rule', 'closed', 'createdAt', 'updatedAt'],
  unique: ['id'],
})

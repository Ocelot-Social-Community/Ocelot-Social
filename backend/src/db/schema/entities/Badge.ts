import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/** Transcribed from db/models/Badge.ts. */
export const Badge = defineEntity({
  label: 'Badge',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['verification', 'trophy'] },
    icon: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'type', 'icon', 'description', 'createdAt'],
  unique: ['id'],
})

import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/File.ts. No nodes exist in a seeded database, so every claim
 * here comes from the model rather than from data — the audit cannot confirm it yet.
 */
export const File = defineEntity({
  label: 'File',
  properties: {
    url: { type: 'string' },
    name: { type: 'string' },
    extension: { type: ['string', 'null'] },
    type: { type: 'string' },
    duration: { type: ['number', 'null'] },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['url'],
  unique: ['url'],
})

import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME, URI } from './patterns'

/** Transcribed from db/models/SocialMedia.ts. */
export const SocialMedia = defineEntity({
  label: 'SocialMedia',
  properties: {
    id: { type: 'string' },
    url: { type: 'string', minLength: 1, pattern: URI },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'url', 'createdAt'],
  unique: ['id'],
})

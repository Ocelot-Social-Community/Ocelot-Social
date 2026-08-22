import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Image.ts. `url` is the primary key, not an id.
 *
 * `createdAt`/`updatedAt`/`sensitive` are missing on 29 of 1207 seeded nodes — images created
 * before those properties existed, so they are optional rather than required.
 */
export const Image = defineEntity({
  label: 'Image',
  properties: {
    url: { type: 'string' },
    alt: { type: ['string', 'null'] },
    type: { type: 'string' },
    sensitive: { type: 'boolean' },
    aspectRatio: { type: 'number' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['url', 'aspectRatio'],
  unique: ['url'],
})

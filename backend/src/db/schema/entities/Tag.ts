import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Tag.ts. The model marks `updatedAt` as required, but only 4 of 7
 * seeded tags carry one — hashtags created by the hashtag middleware do not set it. Declared
 * optional, which is what the data says.
 */
export const Tag = defineEntity({
  label: 'Tag',
  properties: {
    id: { type: 'string' },
    deleted: { type: 'boolean' },
    disabled: { type: 'boolean' },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'deleted', 'disabled'],
  unique: ['id'],
  fulltext: [{ name: 'tag_fulltext_search', properties: ['id'] }],
})

import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/Comment.ts.
 *
 * Declared as part of the pilot because `WROTE` turned out to be polymorphic: the audit run
 * against seeded data found 101 `(:User)-[:WROTE]->(:Comment)` edges next to 158 pointing at
 * posts. A relationship declaration that names only one target label reports those as
 * endpoint violations.
 */
export const Comment = defineEntity({
  label: 'Comment',
  properties: {
    id: { type: 'string' },
    content: { type: 'string', minLength: 3 },
    deleted: { type: 'boolean' },
    disabled: { type: 'boolean' },
    createdByApiKey: { type: 'string' },
    closed: { type: 'boolean' }, // see the note on User.closed
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'content', 'createdAt', 'updatedAt'],
  unique: ['id'],
})

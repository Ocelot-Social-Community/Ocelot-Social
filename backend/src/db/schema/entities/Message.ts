import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * NEW: `Message` has no neode model either — same story as Room. `indexId` is the per-room
 * running number the chat frontend pages by, which is why it carries its own index.
 *
 * `id` is UNIQUE, not merely indexed: it comes from apoc.create.uuid() and every lookup treats
 * it as an identity. The plain index the chat migration once added is superseded by the
 * constraint's own — applyPlan drops it on the way, see `supersedesIndexOn` in derive/apply.ts.
 */
export const Message = defineEntity({
  label: 'Message',
  properties: {
    id: { type: 'string' },
    content: { type: 'string' },
    indexId: { type: 'integer', minimum: 0 },
    saved: { type: 'boolean' },
    distributed: { type: 'boolean' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'content', 'indexId', 'saved', 'distributed', 'createdAt'],
  unique: ['id'],
  indexed: ['indexId'],
})

import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * NEW: `Room` has no neode model at all. Its indices came from a hand-written migration
 * (db/migrations/20260817120000-add-room-and-message-indices.ts) precisely because neode did
 * not know the label. Transcribed from the data and from resolvers/rooms.ts.
 *
 * `id` is UNIQUE for the same reason as Message.id — apoc.create.uuid(), and every lookup
 * treats it as an identity — and carries no plain index beside it: the constraint brings its
 * own. The one that migration created is dropped by applyPlan when it creates the constraint,
 * see `supersedesIndexOn` in derive/apply.ts.
 */
export const Room = defineEntity({
  label: 'Room',
  properties: {
    id: { type: 'string' },
    lastMessageAt: { type: 'string', pattern: ISO_DATE_TIME },
    messageCounter: { type: 'integer', minimum: 0 },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'createdAt'],
  unique: ['id'],
})

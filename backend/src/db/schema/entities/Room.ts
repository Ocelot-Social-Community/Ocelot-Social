import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/**
 * NEW: `Room` has no neode model at all. Its indices live in a hand-written migration
 * (db/migrations/20260817120000-add-room-and-message-indices.ts) precisely because neode did
 * not know the label. Transcribed from the data and from resolvers/rooms.ts.
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
})

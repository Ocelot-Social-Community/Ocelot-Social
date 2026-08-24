import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/** Transcribed from db/models/InviteCode.ts. `code` is the primary key. */
export const InviteCode = defineEntity({
  label: 'InviteCode',
  properties: {
    code: { type: 'string' },
    expiresAt: { type: ['string', 'null'], pattern: ISO_DATE_TIME },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['code', 'createdAt'],
  unique: ['code'],
})

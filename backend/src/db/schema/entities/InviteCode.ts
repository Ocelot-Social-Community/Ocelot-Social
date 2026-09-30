import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/** Transcribed from db/models/InviteCode.ts. `code` is the primary key. */
export const InviteCode = defineEntity({
  label: 'InviteCode',
  properties: {
    code: { type: 'string' },
    expiresAt: { type: ['string', 'null'], pattern: ISO_DATE_TIME },
    externalAllowed: {
      type: 'boolean',
      description:
        'whether this code also entitles its holder to REGISTER (group.invite.external); absent means yes, which is what every code predating the split and every personal code is',
    },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['code', 'createdAt'],
  unique: ['code'],
})

import { defineEntity } from '@db/schema/types'

import { EMAIL, ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/UnverifiedEmailAddress.ts. Unlike EmailAddress this label has no
 * uniqueness constraint — the same address may await verification for several users. No nodes
 * exist in a seeded database, so the audit cannot confirm any of it yet.
 */
export const UnverifiedEmailAddress = defineEntity({
  label: 'UnverifiedEmailAddress',
  properties: {
    email: { type: 'string', pattern: EMAIL },
    nonce: { type: 'string' },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['email', 'createdAt'],
})

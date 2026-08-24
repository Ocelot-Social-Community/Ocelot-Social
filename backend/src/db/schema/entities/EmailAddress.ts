import { defineEntity } from '@db/schema/types'

import { EMAIL, ISO_DATE_TIME } from './patterns'

/**
 * Transcribed from db/models/EmailAddress.ts. `email` is the primary key.
 *
 * neode validated the address with Joi's `email: true`; ajv has no format validation without
 * ajv-formats, so the check is a pattern here. It is deliberately permissive — rejecting a
 * valid address is worse than accepting an odd one, and delivery is the real validator.
 */
export const EmailAddress = defineEntity({
  label: 'EmailAddress',
  properties: {
    email: { type: 'string', pattern: EMAIL },
    nonce: { type: 'string' },
    verifiedAt: { type: 'string', pattern: ISO_DATE_TIME },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['email', 'createdAt'],
  unique: ['email'],
})

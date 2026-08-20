import { defineEntity } from '@db/schema/types'

import { ISO_DATE_TIME } from './patterns'

/** Transcribed from db/models/ApiKey.ts. The key itself is never stored, only its hash. */
export const ApiKey = defineEntity({
  label: 'ApiKey',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    keyHash: { type: 'string' },
    keyPrefix: { type: 'string' },
    disabled: { type: 'boolean' },
    disabledAt: { type: 'string', pattern: ISO_DATE_TIME },
    lastUsedAt: { type: 'string', pattern: ISO_DATE_TIME },
    expiresAt: { type: 'string', pattern: ISO_DATE_TIME },
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
  },
  required: ['id', 'name', 'keyHash', 'keyPrefix', 'disabled', 'createdAt'],
  unique: ['id', 'keyHash'],
})

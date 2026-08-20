import { defineEntity } from '@db/schema/types'

/**
 * NEW: no neode model, and the label does not appear in a seeded database either — it is
 * created on demand by helpers/createPasswordReset.ts. Found while transcribing the
 * relationship types: `REQUESTED` points at it.
 *
 * Both timestamps are NATIVE datetimes (`datetime($issuedAt)`), unlike every other timestamp
 * in this schema, which is an ISO string.
 */
export const PasswordReset = defineEntity({
  label: 'PasswordReset',
  properties: {
    nonce: { type: 'string' },
    issuedAt: { type: 'datetime' },
    usedAt: { type: ['datetime', 'null'] },
  },
  required: ['nonce', 'issuedAt'],
})

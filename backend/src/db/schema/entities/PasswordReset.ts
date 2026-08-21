import { defineEntity } from '@db/schema/types'

/**
 * NEW: no neode model, and the label does not appear in a seeded database either — it is
 * created on demand by helpers/createPasswordReset.ts. Found while transcribing the
 * relationship types: `REQUESTED` points at it.
 *
 * Both timestamps are NATIVE datetimes (`datetime($issuedAt)`), unlike every other timestamp
 * in this schema, which is an ISO string.
 *
 * `nonce` is INDEXED but deliberately NOT unique.
 *
 * Indexed because resetPassword starts at `MATCH (:PasswordReset {nonce: $nonce})`, and
 * nothing ever deletes these nodes — every reset request ever made is still there, so the
 * lookup is a label scan over a set that only grows.
 *
 * Not unique because the nonce is `uuid().substring(0, registration.nonceLength)`, five hex
 * characters by default: ~2^20 values, drawn independently per request. A uniqueness
 * constraint would turn the resulting birthday collisions into a failed CREATE — i.e. a
 * legitimate user could not request a password reset at all — with a probability that rises
 * with the number of nodes already stored.
 *
 * It would also buy nothing: resetPassword does not look a reset up by nonce alone. The
 * second MATCH requires the node to be `(:User)-[:REQUESTED]->` from the user owning the
 * given email, so a nonce shared with a different user's reset is not redeemable. What IS
 * worth revisiting is the nonce's 20 bits of entropy against an unthrottled mutation — but
 * that is a change to token generation, not to a database constraint.
 */
export const PasswordReset = defineEntity({
  label: 'PasswordReset',
  properties: {
    nonce: { type: 'string' },
    issuedAt: { type: 'datetime' },
    usedAt: { type: ['datetime', 'null'] },
  },
  required: ['nonce', 'issuedAt'],
  indexed: ['nonce'],
})

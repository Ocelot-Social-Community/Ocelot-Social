import { Badge } from '@db/schema/entities/Badge'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

// Badges awarded to a user, and the slots a user puts them in.

export const REWARDED = defineRelationship({
  type: 'REWARDED',
  from: Badge,
  to: User,
  cardinality: 'many',
})

export const VERIFIES = defineRelationship({
  type: 'VERIFIES',
  from: Badge,
  to: User,
  cardinality: 'many',
})

export const SELECTED = defineRelationship({
  type: 'SELECTED',
  from: User,
  to: Badge,
  cardinality: 'many',
  // db/models/User.ts declares `slot` as `int`. Three of fourteen seeded edges hold a FLOAT —
  // declared as integer on purpose, so that the audit keeps reporting them.
  properties: { slot: { type: 'integer', minimum: 0 } },
  required: ['slot'],
})

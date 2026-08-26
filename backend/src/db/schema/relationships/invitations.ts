import { Group } from '@db/schema/entities/Group'
import { InviteCode } from '@db/schema/entities/InviteCode'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import { createdAt } from './timestamps'

// Invite codes: who made one, who used it, and which group it opens.

export const GENERATED = defineRelationship({
  type: 'GENERATED',
  from: User,
  to: InviteCode,
  cardinality: 'many',
})

export const REDEEMED = defineRelationship({
  type: 'REDEEMED',
  from: User,
  to: InviteCode,
  cardinality: 'at-most-one',
  properties: { createdAt },
  required: ['createdAt'],
})

export const INVITES_TO = defineRelationship({
  type: 'INVITES_TO',
  from: InviteCode,
  to: Group,
  cardinality: 'at-most-one',
})

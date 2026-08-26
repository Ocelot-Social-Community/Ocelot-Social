import { Group } from '@db/schema/entities/Group'
import { InviteCode } from '@db/schema/entities/InviteCode'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import { createdAt } from './timestamps'

import type { RelationshipDefinition } from '@db/schema/types'

// Invite codes: who made one, who used it, and which group it opens.

export const invitations: readonly RelationshipDefinition[] = [
  defineRelationship({
    type: 'GENERATED',
    from: User,
    to: InviteCode,
    cardinality: 'many',
  }),
  defineRelationship({
    type: 'REDEEMED',
    from: User,
    to: InviteCode,
    cardinality: 'at-most-one',
    properties: { createdAt },
    required: ['createdAt'],
  }),
  defineRelationship({
    type: 'INVITES_TO',
    from: InviteCode,
    to: Group,
    cardinality: 'at-most-one',
  }),
]

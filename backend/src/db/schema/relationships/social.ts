import { Group } from '@db/schema/entities/Group'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import { createdAt, timestamps } from './timestamps'

// User to user, and user to group. The edges that carry `createdAt` because the order in
// which they were made is part of what they mean.

export const FOLLOWS = defineRelationship({
  type: 'FOLLOWS',
  from: User,
  to: User,
  cardinality: 'many',
  properties: { createdAt },
  required: ['createdAt'],
})

export const FRIENDS = defineRelationship({
  type: 'FRIENDS',
  from: User,
  to: User,
  cardinality: 'many',
})

export const MUTED = defineRelationship({
  type: 'MUTED',
  from: User,
  to: User,
  cardinality: 'many',
  properties: { createdAt },
  required: ['createdAt'],
})

export const BLOCKED = defineRelationship({
  type: 'BLOCKED',
  from: User,
  to: User,
  cardinality: 'many',
  properties: { createdAt },
  required: ['createdAt'],
})

export const INVITED = defineRelationship({
  type: 'INVITED',
  from: User,
  to: User,
  cardinality: 'many',
  properties: { createdAt },
  required: ['createdAt'],
})

export const MEMBER_OF = defineRelationship({
  type: 'MEMBER_OF',
  from: User,
  to: Group,
  cardinality: 'many',
  properties: {
    ...timestamps,
    role: { type: 'string', enum: ['pending', 'usual', 'admin', 'owner'] },
    showOnProfile: { type: 'boolean' },
  },
  required: ['createdAt', 'role'],
})

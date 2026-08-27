import { Group } from '@db/schema/entities/Group'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import { createdAt, timestamps } from './timestamps'

import type { RelationshipDefinition } from '@db/schema/types'

// User to user, and user to group. The edges that carry `createdAt` because the order in
// which they were made is part of what they mean.

export const social: readonly RelationshipDefinition[] = [
  defineRelationship({
    type: 'FOLLOWS',
    from: User,
    to: User,
    cardinality: 'many',
    properties: { createdAt },
    required: ['createdAt'],
  }),
  defineRelationship({
    type: 'FRIENDS',
    from: User,
    to: User,
    cardinality: 'many',
  }),
  defineRelationship({
    type: 'MUTED',
    from: User,
    to: User,
    cardinality: 'many',
    properties: { createdAt },
    required: ['createdAt'],
  }),
  defineRelationship({
    type: 'BLOCKED',
    from: User,
    to: User,
    cardinality: 'many',
    properties: { createdAt },
    required: ['createdAt'],
  }),
  defineRelationship({
    type: 'INVITED',
    from: User,
    to: User,
    cardinality: 'many',
    properties: { createdAt },
    required: ['createdAt'],
  }),
  defineRelationship({
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
  }),
]

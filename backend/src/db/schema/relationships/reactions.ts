import { Category } from '@db/schema/entities/Category'
import { Comment } from '@db/schema/entities/Comment'
import { Group } from '@db/schema/entities/Group'
import { Post } from '@db/schema/entities/Post'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import { createdAt, timestamps } from './timestamps'

import type { RelationshipDefinition } from '@db/schema/types'

// What a user did to something they did not write: react to it, watch it, pin it, hide it —
// and what the system tells them about it afterwards.

export const reactions: readonly RelationshipDefinition[] = [
  defineRelationship({
    type: 'EMOTED',
    from: User,
    to: Post,
    cardinality: 'many',
    properties: {
      emotion: { type: 'string', enum: ['happy', 'cry', 'surprised', 'angry', 'funny'] },
    },
    required: ['emotion'],
  }),
  defineRelationship({
    type: 'SHOUTED',
    from: User,
    to: Post,
    cardinality: 'many',
    properties: { createdAt },
    required: ['createdAt'],
  }),
  defineRelationship({
    type: 'OBSERVES',
    from: User,
    to: Post,
    cardinality: 'many',
    properties: { ...timestamps, active: { type: 'boolean' } },
    required: ['createdAt', 'active'],
  }),
  defineRelationship({
    type: 'PINNED',
    from: User,
    to: Post,
    cardinality: 'many',
    properties: { createdAt },
  }),
  defineRelationship({
    type: 'GROUP_PINNED',
    from: User,
    to: Post,
    cardinality: 'many',
    properties: { createdAt },
  }),
  defineRelationship({
    type: 'VIEWED_TEASER',
    from: User,
    to: Post,
    cardinality: 'many',
  }),
  defineRelationship({
    type: 'NOT_INTERESTED_IN',
    from: User,
    to: Category,
    cardinality: 'many',
  }),
  defineRelationship({
    type: 'CANNOT_SEE',
    from: User,
    to: Post,
    cardinality: 'many',
  }),
  defineRelationship({
    type: 'NOTIFIED',
    from: [Post, Comment, Group],
    to: User,
    cardinality: 'many',
    properties: {
      ...timestamps,
      read: { type: 'boolean' },
      reason: { type: 'string' },
      relatedUserId: { type: 'string' },
    },
    required: ['createdAt', 'read', 'reason'],
  }),
]

import { Category } from '@db/schema/entities/Category'
import { Comment } from '@db/schema/entities/Comment'
import { Group } from '@db/schema/entities/Group'
import { Post } from '@db/schema/entities/Post'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import { createdAt, timestamps } from './timestamps'

// What a user did to something they did not write: react to it, watch it, pin it, hide it —
// and what the system tells them about it afterwards.

export const EMOTED = defineRelationship({
  type: 'EMOTED',
  from: User,
  to: Post,
  cardinality: 'many',
  properties: {
    emotion: { type: 'string', enum: ['happy', 'cry', 'surprised', 'angry', 'funny'] },
  },
  required: ['emotion'],
})

export const SHOUTED = defineRelationship({
  type: 'SHOUTED',
  from: User,
  to: Post,
  cardinality: 'many',
  properties: { createdAt },
  required: ['createdAt'],
})

export const OBSERVES = defineRelationship({
  type: 'OBSERVES',
  from: User,
  to: Post,
  cardinality: 'many',
  properties: { ...timestamps, active: { type: 'boolean' } },
  required: ['createdAt', 'active'],
})

export const PINNED = defineRelationship({
  type: 'PINNED',
  from: User,
  to: Post,
  cardinality: 'many',
  properties: { createdAt },
})

export const GROUP_PINNED = defineRelationship({
  type: 'GROUP_PINNED',
  from: User,
  to: Post,
  cardinality: 'many',
  properties: { createdAt },
})

export const VIEWED_TEASER = defineRelationship({
  type: 'VIEWED_TEASER',
  from: User,
  to: Post,
  cardinality: 'many',
})

export const NOT_INTERESTED_IN = defineRelationship({
  type: 'NOT_INTERESTED_IN',
  from: User,
  to: Category,
  cardinality: 'many',
})

export const CANNOT_SEE = defineRelationship({
  type: 'CANNOT_SEE',
  from: User,
  to: Post,
  cardinality: 'many',
})

export const NOTIFIED = defineRelationship({
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
})

import { Group } from '@db/schema/entities/Group'
import { GroupRole } from '@db/schema/entities/GroupRole'
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
      // The NAME of a GroupRole of that group — no enum any more: a group defines its own
      // roles, so the set of valid values is per group and cannot be stated here. The
      // reference is kept honest where it can be: renaming a role rewrites the edges that
      // point at it, and deleting one reassigns them (groupRole/repository.ts).
      role: { type: 'string' },
      showOnProfile: { type: 'boolean' },
    },
    required: ['createdAt', 'role'],
  }),
  defineRelationship({
    // A group owns its role definitions. Deleting the group takes them with it.
    type: 'HAS_GROUP_ROLE',
    from: Group,
    to: GroupRole,
    cardinality: 'many',
  }),
]

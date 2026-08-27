import { Group } from '@db/schema/entities/Group'
import { Message } from '@db/schema/entities/Message'
import { Room } from '@db/schema/entities/Room'
import { SocialMedia } from '@db/schema/entities/SocialMedia'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import type { RelationshipDefinition } from '@db/schema/types'

// Rooms, messages, and the two edges that do not fit anywhere else: a room may belong to a
// group, and social media belongs to its owner.

export const chat: readonly RelationshipDefinition[] = [
  defineRelationship({
    type: 'CREATED',
    from: User,
    to: [Message, Group],
    cardinality: 'many',
  }),
  defineRelationship({
    type: 'CHATS_IN',
    from: User,
    to: Room,
    cardinality: 'many',
  }),
  defineRelationship({
    type: 'INSIDE',
    from: Message,
    to: Room,
    cardinality: 'exactly-one',
  }),
  defineRelationship({
    type: 'ROOM_FOR',
    from: Room,
    to: Group,
    cardinality: 'at-most-one',
  }),
  defineRelationship({
    type: 'OWNED_BY',
    from: SocialMedia,
    to: User,
    cardinality: 'exactly-one',
  }),
  defineRelationship({
    type: 'HAS_NOT_SEEN',
    from: User,
    to: Message,
    cardinality: 'many',
  }),
]

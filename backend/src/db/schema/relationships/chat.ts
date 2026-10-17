import { Group } from '@db/schema/entities/Group'
import { Message } from '@db/schema/entities/Message'
import { Room } from '@db/schema/entities/Room'
import { SocialMedia } from '@db/schema/entities/SocialMedia'
import { User } from '@db/schema/entities/User'
import { VideoCallSession } from '@db/schema/entities/VideoCallSession'
import { defineRelationship } from '@db/schema/types'

import type { RelationshipDefinition } from '@db/schema/types'

// Rooms, messages, video calls, and the two edges that do not fit anywhere else: a room may
// belong to a group or a video call, and social media belongs to its owner.

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
  // What a room is for. A room with no such edge is a direct conversation; one pointing at a
  // group is that group's chat; one pointing at a video call is the conference chat only the
  // participants of that call share.
  defineRelationship({
    type: 'ROOM_FOR',
    from: Room,
    to: [Group, VideoCallSession],
    cardinality: 'at-most-one',
  }),
  // The group a video call takes place in. At most one, and possibly none: a call is not
  // required to belong to a group.
  defineRelationship({
    type: 'CALL_IN',
    from: VideoCallSession,
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

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
  // The moderation of a video call (livekit/moderation.ts), kept on its session and over with it.
  // Who opened the call: they moderate it, and get it back on returning unless they handed it on.
  defineRelationship({
    type: 'STARTED_CALL',
    from: User,
    to: VideoCallSession,
    cardinality: 'many',
    properties: { handedOver: { type: 'boolean' } },
  }),
  defineRelationship({
    type: 'MODERATES_CALL',
    from: User,
    to: VideoCallSession,
    cardinality: 'many',
  }),
  // Taken away by somebody who outranks them; only a holder of group.videoCall.moderate gives it
  // back.
  defineRelationship({
    type: 'LOST_CALL_MODERATION',
    from: User,
    to: VideoCallSession,
    cardinality: 'many',
  }),
  // Given the floor: spared when a moderator mutes everybody.
  defineRelationship({
    type: 'HAS_CALL_FLOOR',
    from: User,
    to: VideoCallSession,
    cardinality: 'many',
  }),
  // Removed from the call: no way back in while it lasts.
  defineRelationship({
    type: 'REMOVED_FROM_CALL',
    from: User,
    to: VideoCallSession,
    cardinality: 'many',
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

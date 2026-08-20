import { ApiKey } from './entities/ApiKey'
import { Badge } from './entities/Badge'
import { Category } from './entities/Category'
import { Comment } from './entities/Comment'
import { EmailAddress } from './entities/EmailAddress'
import { File } from './entities/File'
import { Group } from './entities/Group'
import { Image } from './entities/Image'
import { InviteCode } from './entities/InviteCode'
import { Location } from './entities/Location'
import { Message } from './entities/Message'
import { PasswordReset } from './entities/PasswordReset'
import { ISO_DATE_TIME } from './entities/patterns'
import { Post } from './entities/Post'
import { Report } from './entities/Report'
import { Role } from './entities/Role'
import { Room } from './entities/Room'
import { SocialMedia } from './entities/SocialMedia'
import { Tag } from './entities/Tag'
import { UnverifiedEmailAddress } from './entities/UnverifiedEmailAddress'
import { User } from './entities/User'
import { defineRelationship } from './types'

import type { RelationshipDefinition } from './types'

// Edges, with the part JSON Schema cannot express: which labels they may connect, and how
// many of them a node may have.
//
// No engine enforces either — not Neo4j Community, not Enterprise, not Memgraph. They are
// declared so that derive/audit.ts can generate a query for each, which is the only place
// these rules are checked at all today.
//
// `cardinality` is a DOMAIN statement, not an observation. A seeded database happens to hold
// at most one MUTED edge per user, but muting several users is the point of the feature — so
// it is `many`. Only where the domain forbids a second edge does this say otherwise.

const createdAt = { type: 'string', pattern: ISO_DATE_TIME } as const
const timestamps = { createdAt, updatedAt: { type: 'string', pattern: ISO_DATE_TIME } } as const

// --- identity, authorisation ------------------------------------------------

export const HAS_ROLE = defineRelationship({
  type: 'HAS_ROLE',
  from: User,
  to: Role,
  // What the entire authorisation layer assumes. Stated in a comment in db/models/User.ts
  // and checked by nothing until now.
  cardinality: 'exactly-one',
})

export const PRIMARY_EMAIL = defineRelationship({
  type: 'PRIMARY_EMAIL',
  from: User,
  to: EmailAddress,
  cardinality: 'exactly-one',
})

export const BELONGS_TO = defineRelationship({
  type: 'BELONGS_TO',
  // Two unrelated uses share this type: an address belongs to its user, a report belongs to
  // the thing it reports.
  from: [EmailAddress, UnverifiedEmailAddress, Report],
  to: [User, Post, Comment],
  cardinality: 'at-most-one',
})

export const REQUESTED = defineRelationship({
  type: 'REQUESTED',
  from: User,
  to: PasswordReset,
  cardinality: 'many',
})

export const HAS_API_KEY = defineRelationship({
  type: 'HAS_API_KEY',
  from: User,
  to: ApiKey,
  cardinality: 'many',
})

// --- media ------------------------------------------------------------------

export const AVATAR_IMAGE = defineRelationship({
  type: 'AVATAR_IMAGE',
  from: [User, Group],
  to: Image,
  cardinality: 'at-most-one',
})

export const COVER_IMAGE = defineRelationship({
  type: 'COVER_IMAGE',
  from: User,
  to: Image,
  cardinality: 'at-most-one',
})

export const HERO_IMAGE = defineRelationship({
  type: 'HERO_IMAGE',
  from: Post,
  to: Image,
  cardinality: 'at-most-one',
})

export const ATTACHMENT = defineRelationship({
  type: 'ATTACHMENT',
  from: Message,
  to: File,
  cardinality: 'many',
})

// --- authoring --------------------------------------------------------------

export const WROTE = defineRelationship({
  type: 'WROTE',
  from: User,
  // Polymorphic: 158 edges point at posts, 101 at comments in a seeded database.
  to: [Post, Comment],
  cardinality: 'many',
})

export const COMMENTS = defineRelationship({
  type: 'COMMENTS',
  from: Comment,
  to: Post,
  cardinality: 'exactly-one',
})

export const CATEGORIZED = defineRelationship({
  type: 'CATEGORIZED',
  from: [Post, Group],
  to: Category,
  cardinality: 'many',
})

export const TAGGED = defineRelationship({
  type: 'TAGGED',
  from: Post,
  to: Tag,
  cardinality: 'many',
})

export const IN = defineRelationship({
  type: 'IN',
  from: Post,
  to: Group,
  cardinality: 'at-most-one',
})

export const IS_IN = defineRelationship({
  type: 'IS_IN',
  // Location nests inside Location (city -> country); everything else points into that tree.
  from: [User, Group, Post, Location],
  to: Location,
  cardinality: 'at-most-one',
})

// --- social graph -----------------------------------------------------------

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

// --- reactions, attention ---------------------------------------------------

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

// --- badges -----------------------------------------------------------------

export const REWARDED = defineRelationship({
  type: 'REWARDED',
  from: Badge,
  to: User,
  cardinality: 'many',
})

export const VERIFIES = defineRelationship({
  type: 'VERIFIES',
  from: Badge,
  to: User,
  cardinality: 'many',
})

export const SELECTED = defineRelationship({
  type: 'SELECTED',
  from: User,
  to: Badge,
  cardinality: 'many',
  // db/models/User.ts declares `slot` as `int`. Three of fourteen seeded edges hold a FLOAT —
  // declared as integer on purpose, so that the audit keeps reporting them.
  properties: { slot: { type: 'integer', minimum: 0 } },
  required: ['slot'],
})

// --- invitations ------------------------------------------------------------

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

// --- moderation -------------------------------------------------------------

export const FILED = defineRelationship({
  type: 'FILED',
  from: User,
  to: Report,
  cardinality: 'many',
  properties: {
    createdAt,
    resourceId: { type: 'string' },
    reasonCategory: {
      type: 'string',
      enum: [
        'other',
        'discrimination_etc',
        'pornographic_content_links',
        'glorific_trivia_of_cruel_inhuman_acts',
        'doxing',
        'intentional_intimidation_stalking_persecution',
        'advert_products_services_commercial',
        'criminal_behavior_violation_german_law',
      ],
    },
    reasonDescription: { type: ['string', 'null'] },
  },
  required: ['createdAt', 'resourceId', 'reasonCategory'],
})

export const REVIEWED = defineRelationship({
  type: 'REVIEWED',
  from: User,
  to: Report,
  cardinality: 'many',
  properties: { ...timestamps, disable: { type: 'boolean' }, closed: { type: 'boolean' } },
  required: ['createdAt', 'disable', 'closed'],
})

// --- chat -------------------------------------------------------------------

export const CREATED = defineRelationship({
  type: 'CREATED',
  from: User,
  to: [Message, Group],
  cardinality: 'many',
})

export const CHATS_IN = defineRelationship({
  type: 'CHATS_IN',
  from: User,
  to: Room,
  cardinality: 'many',
})

export const INSIDE = defineRelationship({
  type: 'INSIDE',
  from: Message,
  to: Room,
  cardinality: 'exactly-one',
})

export const ROOM_FOR = defineRelationship({
  type: 'ROOM_FOR',
  from: Room,
  to: Group,
  cardinality: 'at-most-one',
})

export const OWNED_BY = defineRelationship({
  type: 'OWNED_BY',
  from: SocialMedia,
  to: User,
  cardinality: 'exactly-one',
})

export const HAS_NOT_SEEN = defineRelationship({
  type: 'HAS_NOT_SEEN',
  from: User,
  to: Message,
  cardinality: 'many',
})

export const relationships: readonly RelationshipDefinition[] = [
  HAS_ROLE,
  PRIMARY_EMAIL,
  BELONGS_TO,
  REQUESTED,
  HAS_API_KEY,
  AVATAR_IMAGE,
  COVER_IMAGE,
  HERO_IMAGE,
  ATTACHMENT,
  WROTE,
  COMMENTS,
  CATEGORIZED,
  TAGGED,
  IN,
  IS_IN,
  FOLLOWS,
  FRIENDS,
  MUTED,
  BLOCKED,
  INVITED,
  MEMBER_OF,
  EMOTED,
  SHOUTED,
  OBSERVES,
  PINNED,
  GROUP_PINNED,
  VIEWED_TEASER,
  NOT_INTERESTED_IN,
  CANNOT_SEE,
  NOTIFIED,
  REWARDED,
  VERIFIES,
  SELECTED,
  GENERATED,
  REDEEMED,
  INVITES_TO,
  FILED,
  REVIEWED,
  CREATED,
  CHATS_IN,
  INSIDE,
  ROOM_FOR,
  HAS_NOT_SEEN,
  OWNED_BY,
]

import { File } from '@db/schema/entities/File'
import { Group } from '@db/schema/entities/Group'
import { Image } from '@db/schema/entities/Image'
import { Message } from '@db/schema/entities/Message'
import { Post } from '@db/schema/entities/Post'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

import type { RelationshipDefinition } from '@db/schema/types'

// Pictures and files hanging off a node — avatars, covers, hero images, message attachments.

export const media: readonly RelationshipDefinition[] = [
  defineRelationship({
    type: 'AVATAR_IMAGE',
    from: [User, Group],
    to: Image,
    cardinality: 'at-most-one',
  }),
  defineRelationship({
    type: 'COVER_IMAGE',
    from: User,
    to: Image,
    cardinality: 'at-most-one',
  }),
  defineRelationship({
    type: 'HERO_IMAGE',
    from: Post,
    to: Image,
    cardinality: 'at-most-one',
  }),
  defineRelationship({
    type: 'ATTACHMENT',
    from: Message,
    to: File,
    cardinality: 'many',
  }),
]

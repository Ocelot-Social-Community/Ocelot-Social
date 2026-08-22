import { ApiKey } from './entities/ApiKey'
import { Badge } from './entities/Badge'
import { Category } from './entities/Category'
import { Comment } from './entities/Comment'
import { Donations } from './entities/Donations'
import { EmailAddress } from './entities/EmailAddress'
import { File } from './entities/File'
import { Group } from './entities/Group'
import { Image } from './entities/Image'
import { InviteCode } from './entities/InviteCode'
import { Location } from './entities/Location'
import { Message } from './entities/Message'
import { Migration } from './entities/Migration'
import { PasswordReset } from './entities/PasswordReset'
import { Post } from './entities/Post'
import { Report } from './entities/Report'
import { Role } from './entities/Role'
import { Room } from './entities/Room'
import { Setting } from './entities/Setting'
import { SocialMedia } from './entities/SocialMedia'
import { Tag } from './entities/Tag'
import { UnverifiedEmailAddress } from './entities/UnverifiedEmailAddress'
import { User } from './entities/User'
import { relationships } from './relationships'

import type { EntityDefinition } from './types'

// The registry. Everything that may exist in the database is reachable from here — the drift
// check compares it against what the database actually reports (run-audit.ts, section 3), and
// the planned ESLint rule resolves labels in raw Cypher against it.
//
// 24 node labels and 43 relationship types, transcribed from the neode models where one
// exists and from the data plus the resolvers where none does. Room, Message and
// PasswordReset had no model at all; PasswordReset does not even appear in a seeded database
// and surfaced only because REQUESTED points at it.
//
// Nothing in this folder is wired into the running system yet: `neode` still installs the
// constraints and still validates the few writes that go through it.

// Deliberately widened to EntityDefinition. `defineEntity` keeps each declaration narrow —
// that is what makes `unique: ['slugg']` a compile error and EntityProperties<typeof User>
// exact — but a narrow tuple hides every optional key from code that iterates the registry.
// Consumers that need the exact shape import the entity itself.
export const entities: readonly EntityDefinition[] = [
  ApiKey,
  Badge,
  Category,
  Comment,
  Donations,
  EmailAddress,
  File,
  Group,
  Image,
  InviteCode,
  Location,
  Message,
  Migration,
  PasswordReset,
  Post,
  Report,
  Role,
  Room,
  Setting,
  SocialMedia,
  Tag,
  UnverifiedEmailAddress,
  User,
]

export { relationships }
export {
  ApiKey,
  Badge,
  Category,
  Comment,
  Donations,
  EmailAddress,
  File,
  Group,
  Image,
  InviteCode,
  Location,
  Message,
  Migration,
  PasswordReset,
  Post,
  Report,
  Role,
  Room,
  Setting,
  SocialMedia,
  Tag,
  UnverifiedEmailAddress,
  User,
}

/** Every label the database may carry, primary and secondary. */
export const labels = (): string[] => [
  ...new Set(entities.flatMap((entity) => [entity.label, ...(entity.alsoLabelled ?? [])])),
]

export const relationshipTypes = (): string[] => [
  ...new Set(relationships.map((relationship) => relationship.type)),
]

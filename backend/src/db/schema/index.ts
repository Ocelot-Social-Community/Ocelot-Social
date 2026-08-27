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

// The registry. Everything that may exist in the database is reachable from here.
//
// Transcribed from the neode models where one existed and from the data plus the resolvers
// where none did. Room, Message and PasswordReset had no model at all; PasswordReset does not
// even appear in a seeded database and surfaced only because REQUESTED points at it.
//
// It is the running system's source, not a document about it. Four things read it:
//
//   - db/migrate/store.ts, on every deployment: the init container derives the constraint and
//     index DDL from here and applies it (planConstraints/declaredIndexStatements). A label or
//     a `unique` added here changes what the database enforces on the next deploy.
//   - db/schema/validate.ts, on every write that goes through it — the resolvers that used to
//     hand their args to neode now validate against this declaration.
//   - db/testing, for every fixture the specs build.
//   - run-audit.ts, which reports what the backend cannot enforce and what has drifted.
//
// No counts of labels or relationship types here on purpose: the two that used to stand in
// this comment were both wrong by the time anyone read them. `labels()` and
// `relationshipTypes()` below answer the question and cannot go stale.

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

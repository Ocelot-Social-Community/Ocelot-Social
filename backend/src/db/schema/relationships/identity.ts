import { ApiKey } from '@db/schema/entities/ApiKey'
import { Comment } from '@db/schema/entities/Comment'
import { EmailAddress } from '@db/schema/entities/EmailAddress'
import { PasswordReset } from '@db/schema/entities/PasswordReset'
import { Post } from '@db/schema/entities/Post'
import { Report } from '@db/schema/entities/Report'
import { Role } from '@db/schema/entities/Role'
import { UnverifiedEmailAddress } from '@db/schema/entities/UnverifiedEmailAddress'
import { User } from '@db/schema/entities/User'
import { defineRelationship } from '@db/schema/types'

// Who a user is and what they may do: their role, their addresses, their api keys.

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

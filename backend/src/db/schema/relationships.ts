import { ISO_DATE_TIME } from './entities/patterns'
import { Post } from './entities/Post'
import { Role } from './entities/Role'
import { User } from './entities/User'
import { defineRelationship } from './types'

import type { RelationshipDefinition } from './types'

// Edges, with the part JSON Schema cannot express: which labels they may connect, and how
// many of them a node may have.
//
// No engine enforces either — not Neo4j Community, not Enterprise, not Memgraph. They are
// declared so that derive/audit.ts can generate a query for each, which is the only place
// these rules are checked at all today. HAS_ROLE is the case in point: `exactly-one` is what
// the whole authorisation layer assumes and what db/models/User.ts states in a comment.

export const HAS_ROLE = defineRelationship({
  type: 'HAS_ROLE',
  from: User,
  to: Role,
  cardinality: 'exactly-one',
})

export const WROTE = defineRelationship({
  type: 'WROTE',
  from: User,
  to: Post,
  cardinality: 'many',
})

export const OBSERVES = defineRelationship({
  type: 'OBSERVES',
  from: User,
  to: Post,
  cardinality: 'many',
  properties: {
    createdAt: { type: 'string', pattern: ISO_DATE_TIME },
    updatedAt: { type: 'string', pattern: ISO_DATE_TIME },
    active: { type: 'boolean' },
  },
  required: ['createdAt', 'active'],
})

export const relationships: readonly RelationshipDefinition[] = [HAS_ROLE, WROTE, OBSERVES]

import { Post } from './entities/Post'
import { Role } from './entities/Role'
import { User } from './entities/User'
import { relationships } from './relationships'

import type { EntityDefinition } from './types'

// The registry. Everything that may exist in the database is reachable from here — the drift
// check (concept stage P3) compares it against what the database actually reports, and the
// planned ESLint rule resolves labels in raw Cypher against it.
//
// PILOT: three of 23 labels and three of 44 relationship types. The remaining entities follow
// in concept stage P1; until then `neode` remains the source for the rest and nothing in this
// folder is wired into the running system.

// Deliberately widened to EntityDefinition. `defineEntity` keeps each declaration narrow —
// that is what makes `unique: ['slugg']` a compile error and EntityProperties<typeof User>
// exact — but a narrow tuple hides every optional key from code that iterates the registry.
// Consumers that need the exact shape import the entity itself.
export const entities: readonly EntityDefinition[] = [User, Role, Post]

export { relationships }
export { Post, Role, User }

/** Every label the database may carry, primary and secondary. */
export const labels = (): string[] => [
  ...new Set(entities.flatMap((entity) => [entity.label, ...(entity.alsoLabelled ?? [])])),
]

export const relationshipTypes = (): string[] => [
  ...new Set(relationships.map((relationship) => relationship.type)),
]

import * as authoring from './authoring'
import * as badges from './badges'
import * as chat from './chat'
import * as identity from './identity'
import * as invitations from './invitations'
import * as media from './media'
import * as moderation from './moderation'
import * as reactions from './reactions'
import * as social from './social'

import type { RelationshipDefinition } from '@db/schema/types'

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
//
// One file per part of the domain, because an edge belongs to neither of the two entities it
// connects: putting HAS_ROLE in User.ts or in Role.ts would be equally arbitrary, and a
// polymorphic edge with four possible endpoints has no such home at all. The grouping is the
// same one the single file used to draw with comment headers.

export * from './authoring'
export * from './badges'
export * from './chat'
export * from './identity'
export * from './invitations'
export * from './media'
export * from './moderation'
export * from './reactions'
export * from './social'

// Collected from the modules, not relisted by hand.
//
// The list this replaces named all forty-four types a second time, and nothing checked that
// the two agreed — an edge declared and then forgotten here would simply never be audited,
// which is the one failure this whole registry exists to prevent. Splitting the file into nine
// made that easy enough to do accidentally that deriving it was the only defensible option.
//
// Every export of these modules is a relationship: the shared edge properties live in
// ./timestamps, which is deliberately not spread in here. If one ever slipped through,
// schema.spec.ts walks this array asking each entry for its endpoints and would fail.
export const relationships: readonly RelationshipDefinition[] = Object.values({
  ...authoring,
  ...badges,
  ...chat,
  ...identity,
  ...invitations,
  ...media,
  ...moderation,
  ...reactions,
  ...social,
})

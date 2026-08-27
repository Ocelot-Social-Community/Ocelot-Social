import { authoring } from './authoring'
import { badges } from './badges'
import { chat } from './chat'
import { identity } from './identity'
import { invitations } from './invitations'
import { media } from './media'
import { moderation } from './moderation'
import { reactions } from './reactions'
import { social } from './social'

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
//
// Each of those files exports its edges as ONE array rather than as named constants, and this
// is the only place they are joined. The single file this replaces ended with all forty-four
// types written out a second time, with nothing checking that the two agreed — an edge
// declared and then forgotten there would simply never be audited, which is the one failure
// this registry exists to prevent. Nine names listed once each, in the file whose only job is
// listing them, is the smallest version of that risk that does not need reflection over the
// module system to avoid.

export const relationships: readonly RelationshipDefinition[] = [
  ...authoring,
  ...badges,
  ...chat,
  ...identity,
  ...invitations,
  ...media,
  ...moderation,
  ...reactions,
  ...social,
]

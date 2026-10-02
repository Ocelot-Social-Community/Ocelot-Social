// Using a network right inside a group is a deliberate act, not a side effect of holding it.
//
// `group.administer.any_<visibility>` folds the whole group catalog into every group of that
// visibility: settings, roles, membership. That is the recovery path for a group left without an
// owner (concept E8) — and until a moderator asks for it, it is also a quiet power to rewrite any
// group on the network. Concept E18 says such an intervention has to be marked; this is the other
// half of that: it has to be ASKED FOR.
//
// What needs asking, and what does not:
//
//   reading    `group.content.read.any_*` and `group.moderate.any_*` bring the reading rights,
//              and reading IS the moderation work — a report queue that demands a confirmation
//              per reported post would be answered by clicking it away. Stays open.
//   acting     everything else a network right folds in — editing roles, settings, memberships,
//              taking posts out — waits for an explicit elevation, which expires on its own.
//
// The elevation is stored, not inferred: `(:User)-[:ELEVATED_IN]->(:Group)` carries when it was
// asked for, why, and when it lapses. That makes it both the switch and the record.
import type { GroupPermissionKey } from '@src/groupPermission'

/** How long one elevation lasts. Long enough to do the work, short enough to end by itself. */
export const ELEVATION_MINUTES = 60

/**
 * What a network right gives WITHOUT an elevation: looking, and nothing else.
 *
 * Deliberately the same three keys `group.content.read.any_*` folds in, so a moderator reviewing
 * a report sees exactly what they were asked about and has to say so before changing anything.
 */
export const UNELEVATED_NETWORK_RIGHTS: readonly GroupPermissionKey[] = [
  'group.read',
  'group.content.read',
  'group.members.read',
]

/**
 * The network authority as it counts right now. Without an elevation it is narrowed to reading;
 * with one it is whatever the rights fold in.
 */
export function withElevation(
  authority: ReadonlySet<GroupPermissionKey>,
  elevated: boolean,
): Set<GroupPermissionKey> {
  if (elevated) {
    return new Set(authority)
  }
  return new Set([...authority].filter((key) => UNELEVATED_NETWORK_RIGHTS.includes(key)))
}

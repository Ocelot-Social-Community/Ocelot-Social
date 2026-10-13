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
//   finding    `group.read` stays open: the group page is where the elevation is offered, and
//              the admin group list and the report queue have to be able to point at it.
//   everything else a network right folds in — reading the content and the member list,
//              editing roles, settings, memberships, taking posts out — waits for an explicit
//              elevation, which expires on its own.
//
// Reading used to be on the open side ("reading IS the moderation work"). That made a network
// admin a silent reader of every hidden group: their feed carried the content of groups they had
// never opened (#10506). Looking inside a group nobody invited you into is an intervention like
// any other, so it is asked for and recorded like any other. The report queue still shows that a
// report exists and where — the content follows the elevation (concept E19).
//
// The elevation is stored, not inferred: `(:User)-[:ELEVATED_IN]->(:Group)` carries when it was
// asked for, why, and when it lapses. That makes it both the switch and the record.
import type { GroupPermissionKey } from '@src/groupPermission'

/** How long one elevation lasts. Long enough to do the work, short enough to end by itself. */
export const ELEVATION_MINUTES = 60

/**
 * What a network right gives WITHOUT an elevation: finding the group, and nothing else.
 *
 * The profile only — name, description, the elevation offer. Its content and its member list are
 * what the elevation is asked for (#10506).
 */
export const UNELEVATED_NETWORK_RIGHTS: readonly GroupPermissionKey[] = ['group.read']

/**
 * The network authority as it counts right now. Without an elevation it is narrowed to finding;
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

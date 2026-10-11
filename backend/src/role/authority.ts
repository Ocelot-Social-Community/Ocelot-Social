// Who may act on whom in the network (disable, delete, disable via report review): the
// dominance rule of ./dominance.ts, applied to AUTHORITY only.
//
// Comparing whole permission sets put rights into the ranking that give nobody power over
// anybody. A role built for administration — `user.delete.any` and `user.disable`, but no
// posting — did not dominate the plain `user` role, because `user` holds `post.create` and the
// administrative role does not. It could delete nobody, while the webapp still offered the
// button. Group roles hit the same wall and solved it the same way (groupRole/authority.ts).
//
// Only the rights listed below are left out. A key that is not listed counts — so a right
// added to the catalog later is treated as authority until somebody decides otherwise, which
// is the fail-safe direction for a destructive action: it can only block more, never less.
import { allPermissionKeys } from '@src/permission'

import { dominates } from './dominance'

import type { PermissionKey } from '@src/permission'

/**
 * Rights about one's OWN participation, excluded from the act-on comparison: writing,
 * talking, inviting people in, creating groups, managing one's own keys and links. They are
 * what a member DOES, not power over another member, and every ordinary role holds them —
 * counting them would let a role outrank `user` only by also being allowed to post.
 */
export const PARTICIPATION_PERMISSIONS: readonly PermissionKey[] = [
  'post.create',
  'comment.create',
  'socialMedia.create',
  'group.create_public',
  'group.create_closed',
  'group.create_hidden',
  'user.invite',
  'videoCall.create_open',
  'videoCall.create_restricted',
  'apiKey.create',
]

const authorityOf = (permissions: ReadonlySet<PermissionKey>): Set<PermissionKey> => {
  const authority = new Set(permissions)
  for (const key of PARTICIPATION_PERMISSIONS) {
    authority.delete(key)
  }
  return authority
}

const holdsFullCatalog = (permissions: ReadonlySet<PermissionKey>): boolean =>
  allPermissionKeys().every((key) => permissions.has(key))

/**
 * Whether the actor outranks the target in the network: their AUTHORITY is a strict superset
 * of the target's. Peers, higher targets and incomparable roles stay blocked, exactly as with
 * the full sets — only participation no longer decides the ranking.
 *
 * The full catalog — what `owner` resolves to — outranks everybody who does not hold it. With
 * participation left out, that no longer follows from the sets: the default `admin` role holds
 * every authority right there is, and only participation set it below `owner` before. Two
 * holders of the full catalog stay peers (remove an owner by demoting first).
 */
export function dominatesInNetwork(
  actor: ReadonlySet<PermissionKey>,
  target: ReadonlySet<PermissionKey>,
): boolean {
  if (holdsFullCatalog(actor) && !holdsFullCatalog(target)) {
    return true
  }
  return dominates(authorityOf(actor), authorityOf(target))
}

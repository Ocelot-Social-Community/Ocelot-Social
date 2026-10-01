// What a group lets a NON-member read, mirrored onto the group node.
//
// The group's `none` role is the source of truth; these three properties are derived columns.
// They exist because two queries have to answer "may a stranger read this" for MANY groups in
// ONE statement — the post filter (every feed, every search) and the group list — and a
// per-row role lookup is the one thing a feed query cannot afford. Kept in step by the
// repository, the only module that writes roles at all.
//
// This is not a new device: the deprecated `showMembers` property has always been exactly this
// for `group.members.read`. It is generalised here to the other two read rights so the rights
// matrix can decide them instead of `groupType`.
import { defaultTemplateFor } from './defaults'
import { NONE_ROLE } from './types'

import type { GroupPermissionKey } from '@src/groupPermission'

export interface NonMemberAccess {
  /** `group.read` — the group's profile beyond the always-public name/avatar/type. */
  nonMemberRead: boolean
  /** `group.content.read` — its posts and comments. */
  nonMemberContentRead: boolean
  /** `group.members.read` — its member list and count. The old `showMembers` setting. */
  showMembers: boolean
}

/** The derived flags for a non-member role holding these permissions. */
export function nonMemberAccessFrom(
  permissions: readonly GroupPermissionKey[] | null | undefined,
): NonMemberAccess {
  const held = new Set(permissions ?? [])
  return {
    nonMemberRead: held.has('group.read'),
    nonMemberContentRead: held.has('group.content.read'),
    showMembers: held.has('group.members.read'),
  }
}

/**
 * What a group of this type would let a non-member read if it still has the seeded template —
 * which is what the migration writes for a group whose roles predate it, and what the two
 * Cypher fallbacks (`coalesce(g.nonMemberRead, g.groupType <> 'hidden')` and
 * `coalesce(g.nonMemberContentRead, g.groupType = 'public')`) say for the window between
 * deploying the code and running the migration. Derived from the templates rather than
 * written out again, so there is one answer and the spec can hold the fallbacks to it.
 */
export function defaultNonMemberAccessFor(groupType: string): NonMemberAccess {
  const template = defaultTemplateFor(groupType)
  const none = template?.find((role) => role.name === NONE_ROLE)
  return nonMemberAccessFrom(none?.permissions)
}

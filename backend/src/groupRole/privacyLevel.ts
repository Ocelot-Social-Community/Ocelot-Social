// What `public`, `closed` and `hidden` mean once the rights decide.
//
// The three names were a CHOICE: an operator picked one and it determined what outsiders could
// see. They are a RESULT now — of exactly two rights on the group's non-member role — and this
// module is the one place that says so:
//
//   hidden  the profile is not readable, so the group is not listed and not findable
//   closed  the profile is readable, the content is not
//   public  both are readable
//
// Joining is deliberately not part of it. Whether a group asks for approval is not a question
// of visibility: a public group may ask, and a closed one may admit directly — and the network
// rights that quantify over these levels (`group.create_*`, `group.administer.any_*`,
// `group.content.read.any_*`) are about how private a space is, not about its door.
//
// The order matters as much as the mapping: it is what "more private than" means, and that is
// what keeps somebody who may only create public groups from editing one into an unlisted one
// (concept E10).
import { isKnownPermission } from '@src/permission'

import { nonMemberAccessFrom } from './nonMemberAccess'

import type { NonMemberAccess } from './nonMemberAccess'
import type { GroupPermissionKey } from '@src/groupPermission'
import type { PermissionKey } from '@src/permission'

export type GroupPrivacyLevel = 'public' | 'closed' | 'hidden'

/** Least private first. The index IS the privacy, which is what the comparison below uses. */
export const PRIVACY_LEVELS: readonly GroupPrivacyLevel[] = ['public', 'closed', 'hidden']

/** The level a non-member role's READ rights imply. Total: every combination has an answer. */
export function privacyLevelFrom(access: NonMemberAccess): GroupPrivacyLevel {
  if (!access.nonMemberRead) {
    return 'hidden'
  }
  if (!access.nonMemberContentRead) {
    return 'closed'
  }
  return 'public'
}

/** The same, from the permission list of a `none` role. */
export function privacyLevelOfPermissions(
  permissions: readonly GroupPermissionKey[] | null | undefined,
): GroupPrivacyLevel {
  return privacyLevelFrom(nonMemberAccessFrom(permissions))
}

/**
 * Whether `candidate` is more private than `current` — i.e. whether going there takes
 * something away from people outside the group. Equal levels are not "more private", so
 * rewriting a role without changing what outsiders may read never needs a right.
 */
export function isMorePrivate(candidate: GroupPrivacyLevel, current: GroupPrivacyLevel): boolean {
  return PRIVACY_LEVELS.indexOf(candidate) > PRIVACY_LEVELS.indexOf(current)
}

/**
 * The network right to create a group at this level — and therefore the right to make an
 * existing group that private (E10). `group.create_public/_closed/_hidden` are catalog keys;
 * the spec pins that this template still resolves to all three.
 */
export function createPermissionForLevel(level: GroupPrivacyLevel): PermissionKey | null {
  const key = `group.create_${level}`
  return isKnownPermission(key) ? key : null
}

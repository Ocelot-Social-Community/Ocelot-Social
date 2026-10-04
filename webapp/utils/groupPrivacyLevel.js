/**
 * What `public`, `closed` and `hidden` mean, derived from the rights.
 *
 * The backend decides this (groupRole/privacyLevel.ts) and writes it onto the group, so this
 * copy is for ONE purpose: saying what the group will be while somebody is still ticking boxes,
 * before anything is saved. Both read exactly the same two rights of the non-member role, and
 * the spec next to this file pins the mapping — if it ever drifts, the badge lies and the
 * server is still right.
 *
 *   hidden  the profile is not readable, so the group is not listed and not findable
 *   closed  the profile is readable, the content is not
 *   public  both are readable
 *
 * Joining is deliberately not part of it: a public group may ask for approval, and a closed one
 * may let people straight in. That is the door, not the visibility.
 */
export const privacyLevelOf = (nonMemberPermissions) => {
  const held = new Set(nonMemberPermissions ?? [])
  if (!held.has('group.read')) return 'hidden'
  if (!held.has('group.content.read')) return 'closed'
  return 'public'
}

export default privacyLevelOf

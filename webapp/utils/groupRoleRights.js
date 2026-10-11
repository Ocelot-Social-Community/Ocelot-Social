import { PARTICIPATION_RIGHTS, SELF_SERVICE_RIGHTS } from '~/constants/groups'

const NOT_AUTHORITY = [...SELF_SERVICE_RIGHTS, ...PARTICIPATION_RIGHTS]

/**
 * Rights that cannot be held without another one.
 *
 * The webapp side of `withImpliedRights` in backend/src/groupRole/mandatoryRights.ts: reading a
 * group's content or its member list without being able to see the group itself is not a state
 * the product has. The backend closes this on every write; the client closes it too, so a tick
 * shows its full effect immediately instead of after the answer comes back.
 */
const IMPLIED_BY = {
  'group.content.read': ['group.read'],
  'group.members.read': ['group.read'],
}

/**
 * One right ticked or unticked, with the invariant closed in BOTH directions.
 *
 * Ticking drags in what the right cannot be exercised without — which the backend would do
 * anyway. Unticking has to drop what depended on it, and that half only exists here: the
 * backend's implication would otherwise put `group.read` straight back and the untick would
 * look like it did nothing.
 */
export const applyRightChange = (permissions, permissionKey, enabled) => {
  const held = new Set(permissions)
  if (enabled) {
    held.add(permissionKey)
    for (const implied of IMPLIED_BY[permissionKey] ?? []) {
      held.add(implied)
    }
    return [...held]
  }
  held.delete(permissionKey)
  for (const [dependent, implies] of Object.entries(IMPLIED_BY)) {
    if (implies.includes(permissionKey)) {
      held.delete(dependent)
    }
  }
  return [...held]
}

/**
 * Every right one simple sentence is ABOUT — the right itself plus whatever the implication
 * drags along, in either direction.
 *
 * Not the difference a click would make, which depends on where the tick currently is: hovering
 * "outsiders may read the posts" has to point at the same two rows whether the box is ticked or
 * not, or the connection it is there to teach would appear and disappear under the cursor.
 */
export const rightsTouchedBy = (permissionKey) => {
  const touched = new Set([permissionKey])
  for (const implied of IMPLIED_BY[permissionKey] ?? []) {
    touched.add(implied)
  }
  for (const [dependent, implies] of Object.entries(IMPLIED_BY)) {
    if (implies.includes(permissionKey)) {
      touched.add(dependent)
    }
  }
  return [...touched]
}

export default applyRightChange

/**
 * Whether the viewer may put this member on that role — the webapp side of `mayAssignGroupRole`
 * in backend/src/groupRole/authority.ts.
 *
 * Two conditions, and they are about different people: the viewer must **cover** the role being
 * handed out (hold every right it grants, so assigning is never a way to climb), and must
 * **dominate** the member as they are now (hold strictly more than they do, so nobody can be
 * reshaped by an equal or by somebody below them).
 *
 * The one exception to dominance is `outranksMembers`: a network admin elevated with
 * `group.administer.any_<visibility>` stands above every member, owners included.
 *
 * Mirrored rather than left to the server because the server already refuses it: without this
 * the picker offers a moderator the option of demoting an admin and the refusal arrives as a
 * toast, which reads as a fault rather than as a rule.
 */
export const mayAssignGroupRole = ({
  viewerPermissions,
  memberPermissions,
  rolePermissions,
  outranksMembers = false,
}) => {
  // Joining, leaving, writing and talking are not authority (SELF_SERVICE_PERMISSIONS and
  // PARTICIPATION_PERMISSIONS in the backend): every membership role holds them, and a network
  // admin acting in a group they are not in holds none — counting them would lock exactly that
  // admin out of every member.
  const authority = (keys) => new Set((keys ?? []).filter((key) => !NOT_AUTHORITY.includes(key)))
  const held = authority(viewerPermissions)
  if (!held.has('group.member.role.assign')) return false
  const covers = [...authority(rolePermissions)].every((key) => held.has(key))
  if (!covers) return false
  // An elevated network admin stands above every member, owners included, whatever the sets say.
  if (outranksMembers) return true
  // Strictly more than the member: a superset, and not the same set.
  const member = authority(memberPermissions)
  const dominates = [...member].every((key) => held.has(key)) && held.size > member.size
  return dominates
}

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

export default applyRightChange

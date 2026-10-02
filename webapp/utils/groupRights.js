import { NONE_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE } from '~/constants/groups'

/**
 * Whether the viewer holds a right INSIDE a group.
 *
 * The data source is the group itself: every group query asks for `myGroupPermissions`, which
 * the backend resolves as the viewer's role capped by their network rights and the runtime
 * feature gates. A group fetched without the field (an older query, a partially cached object)
 * yields false rather than true — a missing answer is not a yes.
 */
export const canInGroup = (permission, group) =>
  Array.isArray(group?.myGroupPermissions) && group.myGroupPermissions.includes(permission)

/**
 * Whether the viewer is an actual member — a membership that is not just an application.
 *
 * Not a right: "am I in this group" is a fact about the viewer, which several places ask to
 * decide what to show rather than to authorise anything. A non-member has no role at all.
 */
export const isGroupMember = (group) =>
  !!group?.myGroupRole && group.myGroupRole.name !== PENDING_GROUP_ROLE

/** Whether the viewer has applied and is waiting for approval. */
export const isGroupApplicant = (group) => group?.myGroupRole?.name === PENDING_GROUP_ROLE

/**
 * How a group role should read: the label the group chose, otherwise the translation of a
 * seeded name, otherwise the key — a group may invent a role and leave it unlabelled.
 */
export const groupRoleLabel = (role, translate) => {
  if (!role) return ''
  if (role.label) return role.label
  const key = `group.roles.${role.name}`
  const translated = translate(key)
  return translated === key ? role.name : translated
}

// The role ladder, least privileged first: the three system roles in their fixed order, then
// whatever a group invented ordered by breadth, then the protected owner role (which holds the
// whole catalog and is therefore always last). Shared so the group's own matrix, the admin
// templates and anything else that lists roles read in the same direction.
const SYSTEM_ROLE_LADDER = [NONE_GROUP_ROLE, PENDING_GROUP_ROLE, USUAL_GROUP_ROLE]

export const orderRolesByPrivilege = (roles) => {
  const rank = (role) => {
    const index = SYSTEM_ROLE_LADDER.indexOf(role.name)
    if (index !== -1) return index
    if (role.protected) return 100
    // Between the member role and the owner, ordered by breadth so the tabs read as a ladder
    // rather than as an alphabet.
    return 10 + (role.permissions?.length ?? 0) / 100
  }
  return [...roles].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

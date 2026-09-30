import { PENDING_GROUP_ROLE } from '~/constants/groups'

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

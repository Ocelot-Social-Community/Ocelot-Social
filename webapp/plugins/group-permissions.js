import { PENDING_GROUP_ROLE } from '~/constants/groups'

/**
 * Group-scoped rights in the webapp.
 *
 * `$canInGroup('group.post.create', group)` is the group counterpart of `$can('post.create')`.
 * The data source is the group itself: every group query asks for `myGroupPermissions`, which
 * the backend resolves as the viewer's role capped by their network rights and the feature
 * gates. No store module and no extra round trip — unlike network permissions, which are per
 * session, these are per group and travel with it.
 *
 * A group fetched without the field (an older query, a partially cached object) yields false
 * rather than true: a missing answer is not a yes.
 */
export const canInGroup = (permission, group) =>
  Array.isArray(group?.myGroupPermissions) && group.myGroupPermissions.includes(permission)

/**
 * Whether the viewer is an actual member — a membership that is not just an application.
 *
 * Not a right: "am I in this group" is a fact about the viewer, and several places ask it to
 * decide what to show (a tab, a leave button, the chat entry) rather than to authorise
 * anything. A non-member has no role at all, so the field is null for them.
 */
export const isGroupMember = (group) =>
  !!group?.myGroupRole && group.myGroupRole.name !== PENDING_GROUP_ROLE

/** Whether the viewer has applied and is waiting for approval. */
export const isGroupApplicant = (group) => group?.myGroupRole?.name === PENDING_GROUP_ROLE

/**
 * How a group role should read: the label the group chose, otherwise the translation of a
 * seeded name, otherwise the key itself — a group may invent a role and leave it unlabelled.
 */
export const groupRoleLabel = (role, translate) => {
  if (!role) return ''
  if (role.label) return role.label
  const key = `group.roles.${role.name}`
  const translated = translate(key)
  return translated === key ? role.name : translated
}

export default ({ app }, inject) => {
  inject('canInGroup', canInGroup)
  inject('isGroupMember', isGroupMember)
  inject('isGroupApplicant', isGroupApplicant)
  inject('groupRoleLabel', (role) => groupRoleLabel(role, (key) => app.i18n.t(key)))
}

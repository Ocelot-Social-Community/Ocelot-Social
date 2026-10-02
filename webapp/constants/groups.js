/**
 * The group role keys the code itself depends on.
 *
 * A group may relabel these roles but never rename them, which is what makes it safe to name
 * them here: `pending` is an application rather than a membership, and `owner` is the role that
 * holds everything. Every other role name is the group's own business and must not appear in
 * code — that is what `myGroupPermissions` is for.
 */
export const NONE_GROUP_ROLE = 'none'
export const PENDING_GROUP_ROLE = 'pending'
export const USUAL_GROUP_ROLE = 'usual'
export const OWNER_GROUP_ROLE = 'owner'

/**
 * Rights a role that IS a membership cannot be written without — the webapp side of
 * backend/src/groupRole/mandatoryRights.ts. Ticked and locked rather than offered: a group
 * whose members cannot leave it would need somebody else to let them out.
 */
export const MANDATORY_GROUP_RIGHTS = ['group.leave']

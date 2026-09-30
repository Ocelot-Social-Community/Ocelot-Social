/**
 * The group role keys the code itself depends on.
 *
 * A group may relabel these roles but never rename them, which is what makes it safe to name
 * them here: `pending` is an application rather than a membership, and `owner` is the role that
 * holds everything. Every other role name is the group's own business and must not appear in
 * code — that is what `myGroupPermissions` is for.
 */
export const PENDING_GROUP_ROLE = 'pending'
export const OWNER_GROUP_ROLE = 'owner'

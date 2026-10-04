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
export const ADMIN_GROUP_ROLE = 'admin'
export const OWNER_GROUP_ROLE = 'owner'

/**
 * Rights a role that IS a membership cannot be written without — the webapp side of
 * backend/src/groupRole/mandatoryRights.ts. Ticked and locked rather than offered: a group
 * whose members cannot leave it would need somebody else to let them out.
 */
export const MANDATORY_GROUP_RIGHTS = ['group.leave']

/**
 * Rights that only mean something for somebody who is NOT in the group yet — the webapp side of
 * `NON_MEMBER_ONLY_RIGHTS` in backend/src/groupRole/mandatoryRights.ts. Somebody holding a
 * membership role has already joined, and on `pending` a join right would read as "an applicant
 * may admit themselves", which is what approval exists to prevent.
 */
/**
 * The five roles the product itself defines — the webapp side of `SYSTEM_ROLE_NAMES` in
 * backend/src/groupRole/types.ts. A group may relabel them but never rename or delete them.
 *
 * Asked by NAME rather than by the stored `system` flag on purpose. The flag is data, and data
 * needs a migration to become true; the name is what the backend itself refuses renames and
 * deletes on. Reading the flag meant a correctly running instance showed `admin` as an ordinary
 * role until somebody remembered to migrate — the screen disagreeing with the server about a
 * rule the server enforces.
 */
export const SYSTEM_GROUP_ROLES = [
  NONE_GROUP_ROLE,
  PENDING_GROUP_ROLE,
  USUAL_GROUP_ROLE,
  ADMIN_GROUP_ROLE,
  OWNER_GROUP_ROLE,
]

export const isSystemGroupRole = (roleName) => SYSTEM_GROUP_ROLES.includes(roleName)

export const NON_MEMBER_ONLY_RIGHTS = ['group.join', 'group.join.request']

/** Whether the right means anything for this role at all. Mirrors the backend's `isMootFor`. */
export const isMootRight = (roleName, permissionKey) =>
  roleName === NONE_GROUP_ROLE
    ? MANDATORY_GROUP_RIGHTS.includes(permissionKey)
    : NON_MEMBER_ONLY_RIGHTS.includes(permissionKey)

/**
 * WHY a right means nothing here — one reason per case, rather than one sentence for both.
 *
 * There used to be a single `group.rights.moot`, written for `group.leave` on the non-member
 * role ("somebody who is not a member has no membership to leave"). It was then shown on the
 * JOIN rights of member roles as well, where it says something that is simply not the reason.
 */
export const mootReasonFor = (roleName, permissionKey) => {
  if (!isMootRight(roleName, permissionKey)) return null
  return roleName === NONE_GROUP_ROLE ? 'group.rights.mootLeave' : 'group.rights.mootJoin'
}

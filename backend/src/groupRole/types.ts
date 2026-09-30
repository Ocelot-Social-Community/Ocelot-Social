import type { GroupPermissionKey } from '@src/groupPermission'

// A group role is a named, group-owned bundle of group permissions, bound to a member
// via the `role` property on (:User)-[:MEMBER_OF]->(:Group). The catalog (keys) is
// code-owned; role definitions are runtime DATA — per group, unlike the network roles,
// which are global and Redis-synced.
export interface GroupRoleDefinition {
  // The internal key. Stable: Cypher, migrations and ACTIVE_GROUP_ROLES anchor on it,
  // and for the system roles it can never change.
  name: string
  // The group's display name for the role, or null for the i18n default (concept E13).
  // Behaviour hangs off `name`, communication off `label`.
  label?: string | null
  // A role the code's behaviour depends on: the join target (`pending`), the
  // no-membership case (`none`) and the failsafe (`owner`). Cannot be deleted or
  // renamed — its label can still be changed.
  system: boolean
  // Only `owner`: its permissions cannot be edited, and it resolves to the FULL group
  // catalog (see permissionsForGroupRole), so a newly added key is owned automatically.
  protected: boolean
  permissions: GroupPermissionKey[]
}

// The system roles. `none` is the role of someone with no MEMBER_OF edge at all, which
// is what turns "non-member" from an implicit groupType branch into an ordinary role.
export const NONE_ROLE = 'none'
export const PENDING_ROLE = 'pending'
export const OWNER_ROLE = 'owner'

// The two seeded, freely editable roles. Names only — a group may rename, delete or
// replace them, and add any number of roles beside them.
export const USUAL_ROLE = 'usual'
export const ADMIN_ROLE = 'admin'

export const SYSTEM_ROLE_NAMES: readonly string[] = [NONE_ROLE, PENDING_ROLE, OWNER_ROLE]

// The roles that count as an actual membership. `none` is no membership, `pending` is an
// applicant — the same distinction ACTIVE_GROUP_ROLES draws in the resolvers today.
export function isActiveMembershipRole(roleName: string): boolean {
  return roleName !== NONE_ROLE && roleName !== PENDING_ROLE
}

// Where a permission in an effective set came from. Needed beyond display: a network
// admin acting through a `*.any_<type>` right may only promote EXISTING members
// (concept E16), and every such action is logged and marked as a network intervention
// (E18).
export type AuthoritySource = 'membership' | 'network' | 'both'

// A network-level default set of group role definitions, one per group type: what a
// newly created group of that type starts with, and what `resetGroupRoles` restores.
// Unlike per-group roles these are few and global, so they are cached and Redis-synced
// like the network roles and the policy.
export type GroupRoleTemplates = Record<string, GroupRoleDefinition[]>

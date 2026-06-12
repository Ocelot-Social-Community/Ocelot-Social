import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

import type { RoleDefinition } from './types'

// The seeded default roles. Boot-seed writes these idempotently with ON CREATE
// semantics (never overwriting an admin-edited role); the CLI factory-reset is
// the explicit force-overwrite / lockout-recovery path.
//
// SINGLE-ROLE model: a user has exactly one role, and each role's permission set
// is SELF-CONTAINED (no union, no implicit baseline). So `moderator` and `admin`
// list the baseline capabilities explicitly. `owner` stores no permissions: it is
// special-cased to the FULL catalog in RoleService.permissionsForRole — keeping
// its list empty means a newly added permission is automatically owned.
//
// The sets are an audit of the pre-RBAC shield, so a user with a given role keeps
// exactly the effective permissions they had before.

// The baseline capabilities of a standard member.
const BASELINE: RoleDefinition['permissions'] = [
  'post.create',
  'group.create',
  'group.create_hidden',
  'user.invite',
]

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: OWNER_ROLE,
    description:
      'Instance owner — protected superuser with every permission. Cannot be locked out.',
    protected: true,
    permissions: [],
  },
  {
    name: ADMIN_ROLE,
    description: 'Network administrator.',
    protected: false,
    permissions: [
      ...BASELINE,
      'content.moderate',
      'badge.manage',
      'network.statistics.read',
      'role.manage',
      'policy.manage',
      'donation.manage',
      'apiKey.administer',
      'user.email.readAny',
      'user.delete.any',
      'post.pin',
      'post.push',
    ],
  },
  {
    name: MODERATOR_ROLE,
    description: 'Content moderator.',
    protected: false,
    permissions: [...BASELINE, 'content.moderate'],
  },
  {
    name: USER_ROLE,
    description: 'Baseline member — the capabilities a standard user has.',
    protected: false,
    permissions: [...BASELINE],
  },
]

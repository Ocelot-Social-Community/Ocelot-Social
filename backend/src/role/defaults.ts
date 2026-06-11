import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

import type { RoleDefinition } from './types'

// The seeded default roles. Boot-seed writes these idempotently with ON CREATE
// semantics (never overwriting an admin-edited role); the CLI factory-reset
// (R4) is the explicit force-overwrite / lockout-recovery path.
//
// Permission sets are an audit of the pre-RBAC graphql-shield so that, after the
// `user.role` → HAS_ROLE migration (R5), authorization is behaviour-identical.
// The model is ADDITIVE: every user keeps the `user` baseline; moderators/admins
// hold `[user, moderator]` / `[user, admin]`. So a higher role lists only its
// EXTRA permissions — except `admin`, which also carries `content.moderate`
// because today an admin passes `isModerator` too.
//
// `owner` stores no permissions: it is special-cased to the FULL catalog in
// RoleService.permissionsForRoles (expand-then-mask). Keeping its list empty
// means a newly added permission is automatically owned, with nothing to update.
export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: OWNER_ROLE,
    description:
      'Instance owner — protected superuser with every permission. Cannot be locked out.',
    rank: 100,
    protected: true,
    permissions: [],
  },
  {
    name: ADMIN_ROLE,
    description: 'Network administrator.',
    rank: 80,
    protected: false,
    permissions: [
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
    rank: 50,
    protected: false,
    permissions: ['content.moderate'],
  },
  {
    name: USER_ROLE,
    description: 'Baseline member — the capabilities every authenticated user has by default.',
    rank: 10,
    protected: false,
    permissions: ['post.create', 'group.create', 'group.create_hidden', 'user.invite'],
  },
]

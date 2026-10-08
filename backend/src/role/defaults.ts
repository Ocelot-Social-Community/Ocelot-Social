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
  'comment.create',
  'socialMedia.create',
  // Flat per-visibility creation rights. The baseline
  // grants all three for parity with the prior model (group.create covered public +
  // closed, group.create_hidden added hidden) — i.e. every member could create any
  // visibility. Tightening one out of the baseline is a per-role opt-in.
  'group.create_public',
  'group.create_closed',
  'group.create_hidden',
  'user.invite',
  // Only calls in a group anybody may walk into are baseline — which is what the prior
  // public-only implementation meant by "public" (see groupRole/callDoor.ts).
  // videoCall.create_restricted is NOT granted by default: a call nobody can look in on is
  // opt-in per role (owner still holds it via full-catalog expansion).
  'videoCall.create_open',
  // The per-type predecessor, still what the current webapp reads to decide whether the call
  // button may open a call. Goes with the webapp part, together with the catalog entries.
  'videoCall.create_public',
  // Creating personal API keys was open to any authenticated user (when the feature
  // is enabled) — baseline preserves that. NOTE: group 'account', NOT 'administration',
  // so holding it does not make a user count as an admin (isAdmin is group-driven).
  'apiKey.create',
]

// The roles that MUST always exist and are re-ensured on every boot / bootstrap:
// `owner` (the protected failsafe superuser) and `user` (the baseline every
// account and registration resolves to). The OPTIONAL roles (admin, moderator)
// are seeded only on a fresh, empty install and may be permanently deleted
// afterward — the boot-seed will not resurrect them. The factory-reset CLI
// (`db:data:roles`) is the explicit path to restore the full set.
export const MANDATORY_ROLE_NAMES: readonly string[] = [OWNER_ROLE, USER_ROLE]

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: OWNER_ROLE,
    protected: true,
    permissions: [],
  },
  {
    name: ADMIN_ROLE,
    protected: false,
    permissions: [
      ...BASELINE,
      'content.moderate',
      // Reading into groups one is not a member of, so a report about content in a closed or
      // hidden group can actually be reviewed (#9405). Admin must hold everything moderator
      // holds, hence both variants here as well.
      'group.content.read.any_closed',
      'group.content.read.any_hidden',
      'group.moderate.any_closed',
      'group.moderate.any_hidden',
      'badge.manage',
      // admin MUST hold every moderator capability (incl. user.disable) so the
      // act-on dominance rule keeps the intuitive chain owner ⊋ admin ⊋ moderator
      // ⊋ user — i.e. an admin can disable/delete a moderator (see role/dominance.ts).
      'user.disable',
      'network.statistics.read',
      'role.manage',
      'policy.manage',
      'donation.manage',
      'apiKey.administer',
      'user.email.readAny',
      'user.delete.any',
      'post.pin',
      'post.push',
      'branding.manage',
      // Administering a group one does not own: the recovery path for a group left without an
      // owner (#6751), and the only way to reach a hidden group at all.
      'group.administer.any_public',
      'group.administer.any_closed',
      'group.administer.any_hidden',
      'group.roleTemplate.manage',
    ],
  },
  {
    name: MODERATOR_ROLE,
    protected: false,
    // badge.manage is a moderation-group capability (badges are a moderation act),
    // so the default moderator can grant/revoke badges via the moderation area.
    // user.disable lets a moderator deactivate (reversible) abusive accounts — the
    // moderator-grade alternative to the admin-only, irreversible user.delete.any.
    permissions: [
      ...BASELINE,
      'content.moderate',
      // Closed groups only: an unlisted group stays an admin matter, which is the
      // distinction #9405 asks about.
      'group.content.read.any_closed',
      'group.moderate.any_closed',
      'badge.manage',
      'user.disable',
    ],
  },
  {
    name: USER_ROLE,
    protected: false,
    permissions: [...BASELINE],
  },
]

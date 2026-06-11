import type { PermissionKey } from '@src/permission'

// A role is a named, admin-managed bundle of global permissions, bound to users
// via (:User)-[:HAS_ROLE]->(:Role). The catalog (permission keys) is code-owned;
// role definitions are runtime DATA, Redis-synced across instances like policy.
export interface RoleDefinition {
  name: string
  description: string | null
  // Display-only ranking: which badge a multi-role user shows. NO effect on
  // authorization (permissions are a flat union, not a rank).
  rank: number
  // Protected roles (only `owner`) cannot be edited or deleted, and `owner`
  // additionally resolves to the full catalog (see RoleService.permissionsForRoles).
  protected: boolean
  permissions: PermissionKey[]
}

// The four seeded roles. `owner` is the protected failsafe superuser; the rest
// are seeded defaults but fully editable/deletable.
export const OWNER_ROLE = 'owner'
export const ADMIN_ROLE = 'admin'
export const MODERATOR_ROLE = 'moderator'
export const USER_ROLE = 'user'

// Cross-instance change broadcast (Redis). A role was upserted (full definition)
// or deleted (definition omitted). Mirrors PolicyChangeEvent.
export interface RoleChangeEvent {
  name: string
  definition: RoleDefinition | null // null ⇒ deleted
  actor: string
  timestamp: string
}

// Minimal pubsub shape — compatible with both `graphql-subscriptions` PubSub and
// `graphql-redis-subscriptions` RedisPubSub (same contract as PolicyPubSub).
export interface RolePubSub {
  publish: (triggerName: string, payload: unknown) => void | Promise<void>
  subscribe: (
    triggerName: string,
    onMessage: (payload: { roleChanged: RoleChangeEvent }) => void,
  ) => Promise<number>
  unsubscribe: (subId: number) => void
}

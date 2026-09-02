// RoleService — in-memory + Neo4j-backed role resolution. Mirrors PolicyService:
//
// Lifecycle:
//   • init() seeds the default roles (ON CREATE, edit-respecting), populates the
//     in-memory cache, and (if a pubsub is provided) subscribes to
//     ROLE_CHANGED_CHANNEL so other backend instances stay in sync.
//   • permissionsForRole() is the hot path the request context uses to resolve a
//     user's permission set from their single role (owner ⇒ full catalog).
//   • upsertRole() / deleteRole() persist, update the cache, and publish a change.
//
// Multi-instance: eventual consistency via Redis pub/sub; same-name concurrent
// writes resolve last-writer-wins (same trade-off as policy).

import databaseContext from '@context/database'
import { allPermissionKeys, sanitizePermissions } from '@src/permission/index'

import { DEFAULT_ROLES, MANDATORY_ROLE_NAMES } from './defaults'
import { deleteRole as dbDeleteRole, renameRole as dbRenameRole, writeRole } from './repository'
import { OWNER_ROLE, USER_ROLE } from './types'
import { seedDefaultRoleNodes } from './userRoleEdges'

import type { RoleChangeEvent, RoleDefinition, RolePubSub } from './types'
import type { PermissionKey } from '@src/permission/index'

type DbContext = ReturnType<typeof databaseContext>

export const ROLE_CHANGED_CHANNEL = 'roles.changed'

// Client-facing notification channel: published by the role mutations (resolver) when
// a change may alter someone's effective permissions — a role's permission set
// (updateRole/deleteRole) or a user's role assignment (setUserRole). Distinct from the
// internal ROLE_CHANGED_CHANNEL (cross-instance cache sync, role-definition payloads):
// this one only signals connected clients to refetch their permissions, via the
// permissionsChanged GraphQL subscription.
export const PERMISSIONS_CHANGED_CHANNEL = 'permissions.changed'

// Domain-level error (protected-role edit, unknown role, …). Free of any GraphQL
// dependency — the resolver translates it at the transport boundary.
export class RoleValidationError extends Error {}

export class RoleService {
  private readonly cache = new Map<string, RoleDefinition>()
  private initialised = false
  private pubsub: RolePubSub | undefined
  private subscriptionId: number | undefined

  constructor(private readonly db: DbContext = databaseContext()) {}

  async init(pubsub?: RolePubSub): Promise<void> {
    this.pubsub = pubsub

    // Names deleted by a change event during init(): a delete on the (still empty)
    // cache is a no-op, so without remembering it the stale read below would
    // resurrect the role. Only tracked until initialised (post-init deletes apply
    // directly and would just grow this set).
    const deletedDuringInit = new Set<string>()

    // Subscribe BEFORE reading (same reasoning as PolicyService): a change
    // published by another instance in the read/subscribe gap would otherwise be
    // missed, leaving this instance stale until the next change.
    if (pubsub) {
      this.subscriptionId = await pubsub.subscribe(ROLE_CHANGED_CHANNEL, (payload) => {
        const event = payload.roleChanged
        if (!this.initialised && event.definition === null) {
          deletedDuringInit.add(event.name)
        }
        this.applyExternalChange(event)
      })
    }

    // Ensure the default roles and reuse the persisted set for the cache (no second
    // read). Full set on a fresh DB; on an established one only missing mandatory
    // roles (owner/user) are self-healed — a deleted admin/moderator is NOT
    // resurrected (the factory-reset CLI restores them deliberately).
    const roles = await seedDefaultRoleNodes(this.db)
    for (const role of roles) {
      // A concurrent change event during init already set this role to a fresher
      // value — don't clobber it with the read.
      if (this.cache.has(role.name)) {
        continue
      }
      // A concurrent delete event removed this role mid-init; the read snapshot is
      // stale, so don't resurrect it (events win over the initial read).
      if (deletedDuringInit.has(role.name)) {
        continue
      }
      this.cache.set(role.name, role)
    }

    // Boot invariant: the mandatory roles (owner/user) must exist after seeding.
    this.assertMandatoryRoles('init')

    this.initialised = true
  }

  // The MANDATORY roles must exist after (re)seeding — owner (the failsafe superuser)
  // and user (the registration/authorization baseline). A missing one means seeding did
  // not take (DB error, wrong key, a future no-op refactor); fail fast rather than serve
  // a broken instance. Optional roles (admin/moderator) are intentionally NOT required:
  // they may be deleted. Shared by init() (boot) and reload() (out-of-process resync).
  private assertMandatoryRoles(context: string): void {
    const missingMandatory = MANDATORY_ROLE_NAMES.filter((name) => !this.cache.has(name))
    if (missingMandatory.length > 0) {
      throw new Error(
        `RoleService.${context}: mandatory role node(s) missing after seeding: ${missingMandatory.join(
          ', ',
        )}. Refusing to continue — authorization and user registration depend on them.`,
      )
    }
  }

  // Resync the cache from the DB after an out-of-process change (e.g. db:reset/seed):
  // a separate process wipes/reseeds the DB but cannot clear this in-memory cache. We
  // clear first so roles deleted from the DB stop lingering, then re-read the persisted
  // set (re-seeding defaults if needed). Does NOT re-subscribe.
  async reload(): Promise<void> {
    const roles = await seedDefaultRoleNodes(this.db)
    this.cache.clear()
    for (const role of roles) {
      this.cache.set(role.name, role)
    }
    // Same invariant as init(): a resync that lost owner/user left a broken cache, so
    // fail loudly rather than report success with a half-empty role set.
    this.assertMandatoryRoles('reload')
  }

  shutdown(): void {
    if (this.subscriptionId !== undefined && this.pubsub) {
      this.pubsub.unsubscribe(this.subscriptionId)
      this.subscriptionId = undefined
    }
  }

  // The permission set for a user's single role (SINGLE-ROLE model — no union).
  // `owner` EXPANDS to the full catalog (expand-then-mask — never an unconditional
  // bypass, so a scoped token / view-as preview can still narrow it downstream).
  // An unknown role (e.g. a stale edge) falls back to the baseline so a user is
  // never left permission-less.
  permissionsForRole(roleName: string): Set<PermissionKey> {
    if (roleName === OWNER_ROLE) {
      return new Set(allPermissionKeys())
    }
    const def = this.cache.get(roleName) ?? this.cache.get(USER_ROLE)
    return new Set(def?.permissions ?? [])
  }

  getRole(name: string): RoleDefinition | undefined {
    return this.cache.get(name)
  }

  // All role definitions in display order: broadest first. `owner` (the full
  // catalog) on top, then by how many permissions the role grants, ties broken
  // alphabetically. Derived from the role data — there is no ordering field.
  allRoles(): RoleDefinition[] {
    const breadth = (role: RoleDefinition) =>
      role.name === OWNER_ROLE ? Number.POSITIVE_INFINITY : role.permissions.length
    return [...this.cache.values()].sort(
      (a, b) => breadth(b) - breadth(a) || a.name.localeCompare(b.name),
    )
  }

  // Create or update a role. Protected roles (owner) are immutable; a non-protected
  // write may not claim the protected flag. Permissions are sanitised against the
  // catalog. Persists, updates the cache, and broadcasts.
  async upsertRole(
    input: Omit<RoleDefinition, 'permissions'> & { permissions: readonly string[] },
    actor: string,
  ): Promise<RoleDefinition> {
    const existing = this.cache.get(input.name)
    if (existing?.protected) {
      throw new RoleValidationError(`Role '${input.name}' is protected and cannot be edited.`)
    }
    if (input.protected) {
      throw new RoleValidationError('Cannot create or flag a protected role.')
    }

    const definition: RoleDefinition = {
      name: input.name,
      protected: false,
      permissions: sanitizePermissions(input.permissions),
    }

    const now = new Date().toISOString()
    await writeRole(this.db, definition, actor, now)
    this.cache.set(definition.name, definition)
    this.publishChange({ name: definition.name, definition, actor, timestamp: now })
    return definition
  }

  // Rename a role: change its identifier while keeping its permission bundle AND all
  // its members (the HAS_ROLE edges reference node identity, so renaming the node in
  // place preserves them). The mandatory roles (owner/user) cannot be renamed — their
  // names are load-bearing constants (owner ⇒ full-catalog expansion, user ⇒ the
  // baseline fallback). Persists, migrates the cache key (delete old → set new), and
  // broadcasts a rename event carrying the previous name so peers migrate their key too.
  async renameRole(oldName: string, newName: string, actor: string): Promise<RoleDefinition> {
    const existing = this.cache.get(oldName)
    if (!existing) {
      throw new RoleValidationError(`Unknown role: ${oldName}`)
    }
    if (existing.protected) {
      throw new RoleValidationError(`Role '${oldName}' is protected and cannot be renamed.`)
    }
    if (MANDATORY_ROLE_NAMES.includes(oldName)) {
      throw new RoleValidationError(`Role '${oldName}' is mandatory and cannot be renamed.`)
    }
    // A no-op rename (same name) is idempotent success — nothing to persist or broadcast.
    if (oldName === newName) {
      return existing
    }
    if (this.cache.get(newName)) {
      throw new RoleValidationError(`Role '${newName}' already exists.`)
    }

    const definition: RoleDefinition = { ...existing, name: newName }
    const now = new Date().toISOString()
    await dbRenameRole(this.db, oldName, newName, actor, now)
    this.cache.delete(oldName)
    this.cache.set(newName, definition)
    this.publishChange({ name: newName, previousName: oldName, definition, actor, timestamp: now })
    return definition
  }

  async deleteRole(name: string, actor: string): Promise<void> {
    const existing = this.cache.get(name)
    if (!existing) {
      throw new RoleValidationError(`Unknown role: ${name}`)
    }
    if (existing.protected) {
      throw new RoleValidationError(`Role '${name}' is protected and cannot be deleted.`)
    }
    // The baseline role is the default for new users; deleting it would leave
    // signups without a role. It stays editable but not deletable.
    if (name === USER_ROLE) {
      throw new RoleValidationError(
        `Role '${USER_ROLE}' is the baseline role and cannot be deleted.`,
      )
    }
    // A role currently assigned to users cannot be deleted (would orphan them).
    const members = await this.countMembers(name)
    if (members > 0) {
      throw new RoleValidationError(
        `Role '${name}' is assigned to ${String(members)} user(s) and cannot be deleted.`,
      )
    }

    await dbDeleteRole(this.db, name)
    this.cache.delete(name)
    this.publishChange({
      name,
      definition: null,
      actor,
      timestamp: new Date().toISOString(),
    })
  }

  // Number of users whose single role is this one (HAS_ROLE edge; edgeless users
  // fall back to the baseline) — consistent with the member count shown in the admin
  // UI, so "blocked: still assigned" matches what's displayed.
  private async countMembers(name: string): Promise<number> {
    const result = await this.db.query({
      query: `MATCH (u:User)
              WHERE coalesce(u.deleted, false) = false
              OPTIONAL MATCH (u)-[:HAS_ROLE]->(r:Role)
              WITH coalesce(r.name, 'user') AS roleName
              WHERE roleName = $name
              RETURN count(*) AS count`,
      variables: { name },
    })
    return Number(result.records[0]?.get('count') ?? 0)
  }

  // Apply a change broadcast by any instance (including our own echo). Idempotent.
  applyExternalChange(event: RoleChangeEvent): void {
    // A rename arrives as a single event carrying the former name: drop the stale
    // cache key first, so the role is not left duplicated under both names.
    if (event.previousName && event.previousName !== event.name) {
      this.cache.delete(event.previousName)
    }
    if (event.definition === null) {
      this.cache.delete(event.name)
      return
    }
    this.cache.set(event.name, {
      ...event.definition,
      permissions: sanitizePermissions(event.definition.permissions),
    })
  }

  // Broadcast non-blocking: the DB write is the commit point and the local cache
  // is already updated, so a broadcast failure must not fail the caller (mirrors
  // PolicyService.publishChange exactly).
  private publishChange(event: RoleChangeEvent): void {
    try {
      const result = this.pubsub?.publish(ROLE_CHANGED_CHANNEL, { roleChanged: event })
      // eslint-disable-next-line promise/prefer-await-to-callbacks, @typescript-eslint/use-unknown-in-catch-callback-variable
      void Promise.resolve(result).catch((err) => {
        this.warnPublishFailed(err)
      })
      // eslint-disable-next-line no-catch-all/no-catch-all
    } catch (err) {
      this.warnPublishFailed(err)
    }
  }

  private warnPublishFailed(err: unknown): void {
    // eslint-disable-next-line no-console
    console.warn(`[roles] failed to publish ${ROLE_CHANGED_CHANNEL}:`, err)
  }
}

// Module-level singleton; constructed lazily so tests can swap it.
let instance: RoleService | undefined

export function getRoleService(): RoleService {
  instance ??= new RoleService()
  return instance
}

export function setRoleServiceForTesting(svc: RoleService | undefined): void {
  instance = svc
}

// Test-only: a RoleService whose cache is pre-populated and init() is a no-op.
// Avoids any DB access.
interface RoleServiceInternal {
  cache: Map<string, RoleDefinition>
  initialised: boolean
  init: RoleService['init']
}

export function createInMemoryRoleService(roles: RoleDefinition[] = DEFAULT_ROLES): RoleService {
  const svc = Object.create(RoleService.prototype) as unknown as RoleServiceInternal
  svc.cache = new Map(roles.map((role) => [role.name, role]))
  svc.initialised = true
  svc.init = async () => {
    await Promise.resolve()
  }
  return svc as unknown as RoleService
}

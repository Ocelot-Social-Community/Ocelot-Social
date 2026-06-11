// RoleService — in-memory + Neo4j-backed role resolution. Mirrors PolicyService:
//
// Lifecycle:
//   • init() seeds the default roles (ON CREATE, edit-respecting), populates the
//     in-memory cache, and (if a pubsub is provided) subscribes to
//     ROLE_CHANGED_CHANNEL so other backend instances stay in sync.
//   • permissionsForRoles() is the hot path the request context uses to resolve a
//     user's base permission set (owner ⇒ full catalog; otherwise the union).
//   • upsertRole() / deleteRole() persist, update the cache, and publish a change.
//
// Multi-instance: eventual consistency via Redis pub/sub; same-name concurrent
// writes resolve last-writer-wins (same trade-off as policy).

import databaseContext from '@context/database'
import { allPermissionKeys, sanitizePermissions } from '@src/permission'

import { DEFAULT_ROLES } from './defaults'
import { deleteRole as dbDeleteRole, readAllRoles, seedRole, writeRole } from './repository'
import { OWNER_ROLE, USER_ROLE } from './types'

import type { RoleChangeEvent, RoleDefinition, RolePubSub } from './types'
import type { PermissionKey } from '@src/permission'

type DbContext = ReturnType<typeof databaseContext>

export const ROLE_CHANGED_CHANNEL = 'roles.changed'

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

    // Subscribe BEFORE reading (same reasoning as PolicyService): a change
    // published by another instance in the read/subscribe gap would otherwise be
    // missed, leaving this instance stale until the next change.
    if (pubsub) {
      this.subscriptionId = await pubsub.subscribe(ROLE_CHANGED_CHANNEL, (payload) => {
        this.applyExternalChange(payload.roleChanged)
      })
    }

    // Seed defaults idempotently — ON CREATE only, so an admin-edited role is
    // never reverted on restart.
    const now = new Date().toISOString()
    for (const role of DEFAULT_ROLES) {
      await seedRole(this.db, role, now)
    }

    const roles = await readAllRoles(this.db)
    for (const role of roles) {
      // A concurrent change event during init already set this role to a fresher
      // value — don't clobber it with the read.
      if (this.cache.has(role.name)) continue
      this.cache.set(role.name, role)
    }

    this.initialised = true
  }

  shutdown(): void {
    if (this.subscriptionId !== undefined && this.pubsub) {
      this.pubsub.unsubscribe(this.subscriptionId)
      this.subscriptionId = undefined
    }
  }

  // The BASE permission set for a set of role names: the request context applies
  // masks (view-as, OAuth scopes) on top. `owner` is the protected superuser and
  // EXPANDS to the full catalog here (expand-then-mask) — never an unconditional
  // bypass, so a scoped token / view-as preview can still narrow it downstream.
  permissionsForRoles(roleNames: readonly string[]): Set<PermissionKey> {
    if (roleNames.includes(OWNER_ROLE)) {
      return new Set(allPermissionKeys())
    }
    const out = new Set<PermissionKey>()
    for (const name of roleNames) {
      const def = this.cache.get(name)
      if (!def) continue
      for (const permission of def.permissions) out.add(permission)
    }
    return out
  }

  getRole(name: string): RoleDefinition | undefined {
    return this.cache.get(name)
  }

  // All role definitions, ranked high → low for stable display.
  allRoles(): RoleDefinition[] {
    return [...this.cache.values()].sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))
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
      description: input.description,
      rank: input.rank,
      protected: false,
      permissions: sanitizePermissions(input.permissions),
    }

    const now = new Date().toISOString()
    await writeRole(this.db, definition, actor, now)
    this.cache.set(definition.name, definition)
    this.publishChange({ name: definition.name, definition, actor, timestamp: now })
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
    // The baseline role is implicit for every authenticated user (Variante A);
    // deleting it would strip every member's baseline permissions. It stays
    // editable (an admin can change the baseline) but not deletable.
    if (name === USER_ROLE) {
      throw new RoleValidationError(`Role '${USER_ROLE}' is the baseline role and cannot be deleted.`)
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

  // Apply a change broadcast by any instance (including our own echo). Idempotent.
  applyExternalChange(event: RoleChangeEvent): void {
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

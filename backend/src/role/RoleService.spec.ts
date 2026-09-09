import { afterEach, describe, it, expect } from 'vitest'

import { allPermissionKeys } from '@src/permission'

import { DEFAULT_ROLES } from './defaults'
import {
  ROLE_CHANGED_CHANNEL,
  RoleService,
  RoleValidationError,
  createInMemoryRoleService,
  getRoleService,
  setRoleServiceForTesting,
} from './RoleService'
import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

import type { RoleChangeEvent, RolePubSub } from './types'

const BASELINE = [
  'post.create',
  'comment.create',
  'socialMedia.create',
  'group.create_public',
  'group.create_closed',
  'group.create_hidden',
  'user.invite',
  'videoCall.create_public',
  'apiKey.create',
]

describe(RoleService, () => {
  describe('permissionsForRole (single-role resolution)', () => {
    const svc = createInMemoryRoleService()

    it('expands owner to the FULL catalog (expand-then-mask)', () => {
      expect([...svc.permissionsForRole(OWNER_ROLE)].sort()).toEqual(
        [...allPermissionKeys()].sort(),
      )
    })

    it('returns the self-contained baseline for the user role', () => {
      expect([...svc.permissionsForRole(USER_ROLE)].sort()).toEqual([...BASELINE].sort())
    })

    it('returns the self-contained moderator set (baseline + content.moderate + badge.manage)', () => {
      const perms = svc.permissionsForRole(MODERATOR_ROLE)

      expect(perms.has('content.moderate')).toBe(true)
      expect(perms.has('badge.manage')).toBe(true)

      for (const baseline of BASELINE) {
        expect(perms.has(baseline as never)).toBe(true)
      }
    })

    it('returns the self-contained admin set (baseline + moderation + admin extras)', () => {
      const perms = svc.permissionsForRole(ADMIN_ROLE)

      expect(perms.has('content.moderate')).toBe(true)
      expect(perms.has('role.manage')).toBe(true)
      expect(perms.has('policy.manage')).toBe(true)
      expect(perms.has('badge.manage')).toBe(true)

      for (const baseline of BASELINE) {
        expect(perms.has(baseline as never)).toBe(true)
      }
    })

    it('falls back to the baseline for an unknown role (never permission-less)', () => {
      expect([...svc.permissionsForRole('ghost-role')].sort()).toEqual([...BASELINE].sort())
    })

    // Deny-all, not a crash: the cache is empty for the window between construction and init(),
    // and this runs on the request path for every authenticated call. A throw here would turn a
    // slow boot into 500s; an empty set just denies until the roles are loaded.
    it('grants nothing when even the baseline role is not cached yet', () => {
      const empty = createInMemoryRoleService([])

      expect(empty.permissionsForRole(USER_ROLE).size).toBe(0)
      expect(empty.permissionsForRole('anything').size).toBe(0)
    })
  })

  describe('allRoles / getRole', () => {
    const svc = createInMemoryRoleService()

    it('returns roles broadest-first (owner, then by permission count)', () => {
      const names = svc.allRoles().map((role) => role.name)

      expect(names).toEqual([OWNER_ROLE, ADMIN_ROLE, MODERATOR_ROLE, USER_ROLE])
    })

    it('looks up a role by name', () => {
      expect(svc.getRole(OWNER_ROLE)?.protected).toBe(true)
      expect(svc.getRole(USER_ROLE)?.protected).toBe(false)
      expect(svc.getRole('nope')).toBeUndefined()
    })

    // Custom roles routinely end up with the same permission count, and Map iteration order is
    // insertion order — so without the tie-break the admin list would be ordered by whenever the
    // roles happened to be created, and would even differ between instances.
    it('breaks a tie on equal permission count alphabetically', () => {
      const tied = createInMemoryRoleService([
        { name: 'zeta', protected: false, permissions: ['badge.manage'] },
        { name: 'alpha', protected: false, permissions: ['post.create'] },
        { name: 'mid', protected: false, permissions: ['post.create'] },
      ])

      expect(tied.allRoles().map((role) => role.name)).toEqual(['alpha', 'mid', 'zeta'])
    })
  })

  describe('applyExternalChange', () => {
    it('upserts a role into the cache, sanitising its permissions', () => {
      const svc = createInMemoryRoleService([])
      const event: RoleChangeEvent = {
        name: 'editor',
        definition: {
          name: 'editor',
          protected: false,
          permissions: ['post.create', 'ghost.permission'] as never,
        },
        actor: 'u1',
        timestamp: 't',
      }
      svc.applyExternalChange(event)

      expect(svc.getRole('editor')?.permissions).toEqual(['post.create'])
    })

    it('removes a role on a delete event', () => {
      const svc = createInMemoryRoleService(DEFAULT_ROLES)
      svc.applyExternalChange({
        name: MODERATOR_ROLE,
        definition: null,
        actor: 'u1',
        timestamp: 't',
      })

      expect(svc.getRole(MODERATOR_ROLE)).toBeUndefined()
    })

    it('migrates the cache key on a rename event (drops the previous name), sanitising permissions', () => {
      const svc = createInMemoryRoleService(DEFAULT_ROLES)
      svc.applyExternalChange({
        name: 'staff',
        previousName: MODERATOR_ROLE,
        definition: {
          name: 'staff',
          protected: false,
          // A catalog-drift key must be filtered out on the rename path too.
          permissions: ['content.moderate', 'ghost.permission'] as never,
        },
        actor: 'u1',
        timestamp: 't',
      })

      expect(svc.getRole(MODERATOR_ROLE)).toBeUndefined()
      expect(svc.getRole('staff')?.permissions).toEqual(['content.moderate'])
    })
  })

  describe('upsert / delete guards (throw before any DB access)', () => {
    const svc = createInMemoryRoleService()

    it('refuses to edit a protected role', async () => {
      await expect(
        svc.upsertRole({ name: OWNER_ROLE, protected: false, permissions: [] }, 'u1'),
      ).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to create a role flagged protected', async () => {
      await expect(
        svc.upsertRole({ name: 'evil', protected: true, permissions: [] }, 'u1'),
      ).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to delete a protected role', async () => {
      await expect(svc.deleteRole(OWNER_ROLE, 'u1')).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to delete the baseline user role (implicit for every member)', async () => {
      await expect(svc.deleteRole(USER_ROLE, 'u1')).rejects.toBeInstanceOf(RoleValidationError)
      // but the baseline stays editable
      expect(svc.getRole(USER_ROLE)?.protected).toBe(false)
    })

    it('refuses to delete an unknown role', async () => {
      await expect(svc.deleteRole('nope', 'u1')).rejects.toBeInstanceOf(RoleValidationError)
    })

    it('refuses to rename a protected role', async () => {
      await expect(svc.renameRole(OWNER_ROLE, 'boss', 'u1')).rejects.toBeInstanceOf(
        RoleValidationError,
      )
    })

    it('refuses to rename a mandatory role (the baseline user role)', async () => {
      await expect(svc.renameRole(USER_ROLE, 'member', 'u1')).rejects.toBeInstanceOf(
        RoleValidationError,
      )
    })

    it('refuses to rename an unknown role', async () => {
      await expect(svc.renameRole('nope', 'whatever', 'u1')).rejects.toBeInstanceOf(
        RoleValidationError,
      )
    })

    it('refuses to rename onto an existing role name', async () => {
      await expect(svc.renameRole(MODERATOR_ROLE, ADMIN_ROLE, 'u1')).rejects.toBeInstanceOf(
        RoleValidationError,
      )
    })

    // The admin form submits the whole role, so saving it without touching the name arrives here
    // as old === new. Treating that as a rename would run the DB rename and broadcast a
    // previousName equal to the name — and peers delete the previous key BEFORE setting the new
    // one, so an identical pair would evict the role from every other instance's cache.
    it('treats a rename to the same name as an idempotent no-op', async () => {
      const before = svc.getRole(MODERATOR_ROLE)

      await expect(svc.renameRole(MODERATOR_ROLE, MODERATOR_ROLE, 'u1')).resolves.toBe(before)
      expect(svc.getRole(MODERATOR_ROLE)).toBe(before)
    })
  })

  describe(createInMemoryRoleService, () => {
    // The DB-free double is handed to getContext() by most specs, and those go through the same
    // startup path as production. init() has to be a working no-op there: the real one reads and
    // seeds role nodes, which is exactly the database access this double exists to avoid.
    it('has an init() that resolves without touching a database', async () => {
      const svc = createInMemoryRoleService()

      await expect(svc.init()).resolves.toBeUndefined()
      expect(svc.getRole(OWNER_ROLE)).toBeDefined()
    })
  })

  describe('the module singleton', () => {
    // These cases install real instances into the module-level slot; hand it back empty so no
    // later case in this file resolves permissions through one of them.
    afterEach(() => {
      setRoleServiceForTesting(undefined)
    })

    it('returns the same instance on repeated calls', () => {
      // Not a detail: the instance OWNS the role cache and the pub/sub subscription. A second
      // one would serve permissions from a cache nothing keeps up to date.
      setRoleServiceForTesting(undefined)
      const first = getRoleService()

      expect(getRoleService()).toBe(first)
    })

    it('can be replaced by a test double and reset again', () => {
      const double = createInMemoryRoleService()
      setRoleServiceForTesting(double)

      expect(getRoleService()).toBe(double)

      // Leaving the double installed would leak into every later spec in this worker.
      setRoleServiceForTesting(undefined)

      expect(getRoleService()).not.toBe(double)
    })
  })

  describe('upsert / delete success paths (fake DB + pubsub)', () => {
    type DbArg = ConstructorParameters<typeof RoleService>[0]

    // A neode-style record for readAllRoles (name/protected/permissions-as-JSON).
    const roleRecord = (role: { name: string; protected: boolean; permissions: string[] }) => ({
      get: (key: string) => {
        if (key === 'permissions') {
          return JSON.stringify(role.permissions)
        }
        if (key === 'protected') {
          return role.protected
        }
        return role.name
      },
    })

    const makeService = () => {
      const writes: Array<{ query: string; variables?: object }> = []
      const published: Array<{ channel: string; payload: { roleChanged: RoleChangeEvent } }> = []
      const fakeDb = {
        // Return the seeded defaults: a non-empty DB (established install), so
        // init() ensures the mandatory roles and its boot invariant is satisfied.
        query: async () => Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) }),
        write: async (statement: { query: string; variables?: object }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const fakePubsub: RolePubSub = {
        publish: (channel, payload) => {
          published.push({ channel, payload: payload as { roleChanged: RoleChangeEvent } })
        },
        subscribe: async () => Promise.resolve(1),
        unsubscribe: () => undefined,
      }
      return { svc: new RoleService(fakeDb), writes, published, fakePubsub }
    }

    it('persists, caches and broadcasts a created role (permissions sanitised)', async () => {
      const { svc, writes, published, fakePubsub } = makeService()
      await svc.init(fakePubsub)

      const created = await svc.upsertRole(
        {
          name: 'badge-setter',
          protected: false,
          permissions: ['badge.manage', 'ghost.permission'],
        },
        'admin-1',
      )

      expect(created.permissions).toEqual(['badge.manage'])
      expect(svc.getRole('badge-setter')?.permissions).toEqual(['badge.manage'])
      // last write is the role upsert
      expect(writes[writes.length - 1]?.variables).toMatchObject({
        name: 'badge-setter',
        actor: 'admin-1',
      })

      const event = published[published.length - 1]?.payload.roleChanged

      expect(event?.name).toBe('badge-setter')
      expect(event?.definition?.permissions).toEqual(['badge.manage'])
    })

    it('deletes a role and broadcasts a tombstone', async () => {
      const { svc, published, fakePubsub } = makeService()
      await svc.init(fakePubsub)
      await svc.upsertRole({ name: 'temp', protected: false, permissions: [] }, 'admin-1')

      await svc.deleteRole('temp', 'admin-1')

      expect(svc.getRole('temp')).toBeUndefined()

      const event = published[published.length - 1]?.payload.roleChanged

      expect(event).toMatchObject({ name: 'temp', definition: null, actor: 'admin-1' })
    })

    it('renames a role: migrates the cache key, persists, and broadcasts previousName', async () => {
      const { svc, writes, published, fakePubsub } = makeService()
      await svc.init(fakePubsub)
      await svc.upsertRole({ name: 'temp', protected: false, permissions: ['badge.manage'] }, 'a-1')

      const renamed = await svc.renameRole('temp', 'badge-setter', 'a-1')

      expect(renamed).toMatchObject({ name: 'badge-setter', permissions: ['badge.manage'] })
      // Cache key migrated, permissions preserved.
      expect(svc.getRole('temp')).toBeUndefined()
      expect(svc.getRole('badge-setter')?.permissions).toEqual(['badge.manage'])
      // Persisted as a rename (old → new), not a create.
      expect(writes[writes.length - 1]?.variables).toMatchObject({
        oldName: 'temp',
        newName: 'badge-setter',
        actor: 'a-1',
      })

      // Broadcast carries the previous name so peers drop the stale key.
      const event = published[published.length - 1]?.payload.roleChanged

      expect(event).toMatchObject({
        name: 'badge-setter',
        previousName: 'temp',
        actor: 'a-1',
      })
      expect(event?.definition?.permissions).toEqual(['badge.manage'])
    })

    it('refuses to start (boot invariant) when a mandatory role is missing after seeding', async () => {
      // The write never lands (fake write is a no-op), so `user` stays missing even
      // after the self-heal attempt. init() must reject so a broken instance never
      // serves traffic.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fakeDb = {
        query: async () =>
          Promise.resolve({
            records: DEFAULT_ROLES.filter((role) => role.name !== USER_ROLE).map(roleRecord),
          }),
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)

      await expect(svc.init()).rejects.toThrow(/mandatory role node\(s\) missing after seeding/)

      warn.mockRestore()
    })

    it('seeds the full default set on a fresh (empty) install', async () => {
      const writes: Array<{ variables?: { name?: string } }> = []
      let queryCalls = 0
      const fakeDb = {
        query: async () => {
          queryCalls += 1
          // First read (the fresh-check) sees an empty DB; later reads reflect the
          // now-seeded roles so init()'s cache + invariant pass.
          return Promise.resolve({ records: queryCalls === 1 ? [] : DEFAULT_ROLES.map(roleRecord) })
        },
        write: async (statement: { variables?: { name?: string } }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      const seeded = writes.map((w) => w.variables?.name)

      expect(seeded).toEqual(
        expect.arrayContaining([OWNER_ROLE, ADMIN_ROLE, MODERATOR_ROLE, USER_ROLE]),
      )
    })

    it('writes nothing on an established install where all roles already exist', async () => {
      const writes: Array<{ variables?: { name?: string } }> = []
      const fakeDb = {
        query: async () => Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) }), // all present
        write: async (statement: { variables?: { name?: string } }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      // Steady state: a single read, zero writes — no MERGE churn per boot.
      expect(writes).toHaveLength(0)
    })

    it('reload() resyncs the cache from the DB, dropping roles no longer present', async () => {
      const { svc, fakePubsub } = makeService()
      await svc.init(fakePubsub)
      // A role that lives only in this instance's cache (e.g. created then removed in
      // the DB out-of-process) — what a stale cache after db:reset looks like.
      svc.applyExternalChange({
        name: 'ghost',
        definition: { name: 'ghost', protected: false, permissions: [] },
        actor: 'x',
        timestamp: 't',
      })

      expect(svc.getRole('ghost')).toBeDefined()

      await svc.reload()

      // The (fake) DB returns only the defaults → the stale role is gone, defaults stay.
      expect(svc.getRole('ghost')).toBeUndefined()
      expect(svc.getRole(ADMIN_ROLE)).toBeDefined()
      expect(svc.getRole(USER_ROLE)).toBeDefined()
    })

    it('reload() enforces the mandatory-role invariant (rejects when owner/user is missing)', async () => {
      // Same boot invariant as init(): if the resync ends up without a mandatory role
      // (here `user` never lands because the fake write is a no-op), reload() must reject
      // rather than silently install a half-empty role set.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fakeDb = {
        query: async () =>
          Promise.resolve({
            records: DEFAULT_ROLES.filter((role) => role.name !== USER_ROLE).map(roleRecord),
          }),
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)

      await expect(svc.reload()).rejects.toThrow(/mandatory role node\(s\) missing after seeding/)

      warn.mockRestore()
    })

    it('does not resurrect a role deleted by an event that arrives during init()', async () => {
      // Race: another instance deletes `admin` while this one is booting. The delete
      // event lands during the role read (cache still empty → delete is a no-op), and
      // the read snapshot is stale (still contains admin). init() must NOT re-add it.
      let onChange: ((payload: { roleChanged: RoleChangeEvent }) => void) | undefined
      let fired = false
      const fakeDb = {
        query: async () => {
          // Fire the delete mid-read, before the cache-fill loop runs.
          if (!fired && onChange) {
            fired = true
            onChange({
              roleChanged: {
                name: ADMIN_ROLE,
                definition: null,
                actor: 'other-instance',
                timestamp: 't',
              },
            })
          }
          return Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) }) // stale: still has admin
        },
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const fakePubsub: RolePubSub = {
        publish: () => undefined,
        subscribe: async (_channel, listener) => {
          onChange = listener
          return Promise.resolve(1)
        },
        unsubscribe: () => undefined,
      }
      const svc = new RoleService(fakeDb)
      await svc.init(fakePubsub)

      expect(svc.getRole(ADMIN_ROLE)).toBeUndefined() // stayed deleted, not resurrected
      // The mandatory roles (and the unaffected optional one) are still cached.
      expect(svc.getRole(OWNER_ROLE)).toBeDefined()
      expect(svc.getRole(USER_ROLE)).toBeDefined()
      expect(svc.getRole(MODERATOR_ROLE)).toBeDefined()
    })

    it('self-heals only the missing mandatory role (not admin/moderator) and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const writes: Array<{ variables?: { name?: string } }> = []
      let queryCalls = 0
      const fakeDb = {
        query: async () => {
          queryCalls += 1
          // First read: `user` is missing on a non-empty DB. Re-read (after the
          // heal write) reflects it restored, so the boot invariant passes.
          return Promise.resolve({
            records:
              queryCalls === 1
                ? DEFAULT_ROLES.filter((role) => role.name !== USER_ROLE).map(roleRecord)
                : DEFAULT_ROLES.map(roleRecord),
          })
        },
        write: async (statement: { variables?: { name?: string } }) => {
          writes.push(statement)
          return Promise.resolve({ records: [] })
        },
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      const seeded = writes.map((w) => w.variables?.name)

      expect(seeded).toEqual([USER_ROLE]) // only the missing mandatory role
      expect(seeded).not.toContain(ADMIN_ROLE)
      expect(seeded).not.toContain(MODERATOR_ROLE)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(USER_ROLE))

      warn.mockRestore()
    })

    it('keeps a role an event updated during init() instead of overwriting it with the read', async () => {
      // The mirror image of the delete race already covered above: another instance CHANGES a
      // role while this one boots. The event carries the newer permission set; the read snapshot
      // taken moments earlier carries the old one. Without the cache-hit guard the loop would
      // write the stale snapshot over the fresh event and this instance would enforce the
      // superseded permissions until the next change — with no way to notice.
      let onChange: ((payload: { roleChanged: RoleChangeEvent }) => void) | undefined
      let fired = false
      const fakeDb = {
        query: async () => {
          if (!fired && onChange) {
            fired = true
            onChange({
              roleChanged: {
                name: MODERATOR_ROLE,
                definition: {
                  name: MODERATOR_ROLE,
                  protected: false,
                  permissions: ['content.moderate'],
                },
                actor: 'other-instance',
                timestamp: 't',
              },
            })
          }
          return Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) })
        },
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const fakePubsub: RolePubSub = {
        publish: () => undefined,
        subscribe: async (_channel, listener) => {
          onChange = listener
          return Promise.resolve(1)
        },
        unsubscribe: () => undefined,
      }
      const svc = new RoleService(fakeDb)
      await svc.init(fakePubsub)

      expect(svc.getRole(MODERATOR_ROLE)?.permissions).toEqual(['content.moderate'])
    })

    it('refuses to delete a role that still has members', async () => {
      // Deleting it would orphan those users: their HAS_ROLE edge disappears and they silently
      // drop to the baseline role. The count comes from the same query the admin UI displays, so
      // the refusal always matches the number shown next to the role.
      const fakeDb = {
        query: async (statement: { query: string }) =>
          Promise.resolve({
            records: statement.query.includes('count(*)')
              ? [{ get: () => 3 }]
              : DEFAULT_ROLES.map(roleRecord),
          }),
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      await expect(svc.deleteRole(MODERATOR_ROLE, 'admin-1')).rejects.toThrow(
        `Role '${MODERATOR_ROLE}' is assigned to 3 user(s) and cannot be deleted.`,
      )
      // Still cached, so the instance keeps resolving permissions for its members.
      expect(svc.getRole(MODERATOR_ROLE)).toBeDefined()
    })

    it('reads a count query that returned no row as zero members', async () => {
      // Defensive, and worth being explicit about: reading a missing row as `Number(undefined)`
      // gives NaN, and every comparison against NaN is false — the guard would pass for a reason
      // that has nothing to do with the role being empty, and the error message it does produce
      // ("assigned to NaN user(s)") would send whoever hits it looking in the wrong place.
      const fakeDb = {
        query: async (statement: { query: string }) =>
          Promise.resolve({
            records: statement.query.includes('count(*)') ? [] : DEFAULT_ROLES.map(roleRecord),
          }),
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const svc = new RoleService(fakeDb)
      await svc.init()

      await expect(svc.deleteRole(MODERATOR_ROLE, 'admin-1')).resolves.toBeUndefined()
      expect(svc.getRole(MODERATOR_ROLE)).toBeUndefined()
    })

    it('unsubscribes on shutdown, once', async () => {
      // The subscription holds a reference to this service. A restarted service (db:reset in the
      // dev server, a re-init in a spec) that left the old one attached would have two listeners
      // mutating two caches, and the stale one keeps a Redis connection open.
      const unsubscribed: number[] = []
      const fakeDb = {
        query: async () => Promise.resolve({ records: DEFAULT_ROLES.map(roleRecord) }),
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const fakePubsub: RolePubSub = {
        publish: () => undefined,
        subscribe: async () => Promise.resolve(42),
        unsubscribe: (id) => {
          unsubscribed.push(id)
        },
      }
      const svc = new RoleService(fakeDb)
      await svc.init(fakePubsub)

      svc.shutdown()
      svc.shutdown() // idempotent: a second call must not unsubscribe an id already released

      expect(unsubscribed).toEqual([42])
    })

    it('does nothing on shutdown when no pubsub was attached', () => {
      const svc = createInMemoryRoleService()

      expect(() => {
        svc.shutdown()
      }).not.toThrow()
    })
  })

  // The DB write is the commit point and the local cache is already updated by the time the
  // broadcast goes out. A pubsub failure therefore costs peers a stale cache until the next
  // change — bad, but far better than failing a role update the database has already accepted.
  describe('broadcast failures do not fail the caller', () => {
    type DbArg = ConstructorParameters<typeof RoleService>[0]

    const makeService = (publish: RolePubSub['publish']) => {
      const fakeDb = {
        query: async () => Promise.resolve({ records: [] }),
        write: async () => Promise.resolve({ records: [] }),
      } as unknown as DbArg
      const svc = createInMemoryRoleService()
      // The in-memory double skips init(), so wire the collaborators it would have set there.
      Object.assign(svc, {
        db: fakeDb,
        pubsub: {
          publish,
          subscribe: async () => Promise.resolve(1),
          unsubscribe: () => undefined,
        },
      })
      return svc
    }

    it('warns instead of throwing when publish rejects', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const boom = new Error('redis connection lost')
      const svc = makeService(async () => {
        await Promise.resolve()
        throw boom
      })

      await expect(
        svc.upsertRole({ name: 'editor', protected: false, permissions: [] }, 'admin-1'),
      ).resolves.toMatchObject({ name: 'editor' })

      // The rejection is handled on a later tick than the resolved upsert.
      await Promise.resolve()

      expect(warn).toHaveBeenCalledWith(`[roles] failed to publish ${ROLE_CHANGED_CHANNEL}:`, boom)

      warn.mockRestore()
    })

    it('warns instead of throwing when publish throws synchronously', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const boom = new Error('no redis configured')
      const svc = makeService(() => {
        throw boom
      })

      await expect(
        svc.upsertRole({ name: 'editor', protected: false, permissions: [] }, 'admin-1'),
      ).resolves.toMatchObject({ name: 'editor' })

      expect(warn).toHaveBeenCalledWith(`[roles] failed to publish ${ROLE_CHANGED_CHANNEL}:`, boom)

      warn.mockRestore()
    })
  })
})
